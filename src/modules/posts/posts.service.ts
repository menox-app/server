import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { BaseRepository } from '@/infrastructure/repositories/base.repository';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Knex } from 'knex';
import { CreatePostDto } from './dtos/create-post.dto';
import { randomUUID } from 'crypto';
import { Collections } from '@/common/enums/collections.enum';
import { GetAllPostsDto, PostFeedMode } from './dtos/get-all-post.dto';
import { AdaptiveCacheService } from '@/infrastructure/redis/adaptive-cache.service';
import { RedisService } from '@/infrastructure/redis/redis.service';
import { FollowsService } from '../follows/follows.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notifications/enums/notifications.enum';

@Injectable()
export class PostsService extends BaseRepository {
    private readonly logger = new Logger(PostsService.name);

    constructor(
        @Inject(KNEX_CONNECTION) knex: Knex,
        private readonly adaptiveCacheService: AdaptiveCacheService,
        private readonly redisService: RedisService,
        private readonly followService: FollowsService,
        private readonly eventEmitter: EventEmitter2
    ) {
        super(knex);
    }

    /**
     * TẠO BÀI VIẾT MỚI
     */
    async createPost(userId: string, createPostDto: CreatePostDto) {
        const { content, mediaUrls, visibility } = createPostDto;
        return this.transaction(async (trx) => {
            const [post] = await trx(Collections.POSTS)
                .insert({
                    id: randomUUID(),
                    author_id: userId,
                    content: content,
                    visibility: visibility || 'public',
                }).returning('*');

            if (mediaUrls && mediaUrls.length > 0) {
                const mediaData = mediaUrls.map((url) => ({
                    id: randomUUID(),
                    post_id: post.id,
                    url: url,
                    type: 'image',
                }));
                await trx(Collections.POST_MEDIAS).insert(mediaData);
            }

            // Xóa cache bài viết chung
            if (this.redisService.getClient().status === 'ready') {
                this.redisService.removeKeysByPrefix('posts:all');
                
                /**
                 * ❄️ TẠM THỜI ĐÓNG BĂNG FAN-OUT ĐỂ TIẾT KIỆM REQUEST (Dùng Upstash Free)
                 * Khi nào có VPS riêng thì mở ra để đạt hiệu năng tối đa
                 */
                // await this.fanOutPost(userId, post.id).catch(err => this.logger.error(`Fan-out failed: ${err.message}`));
            }

            return post;
        })
    }

    /**
     * LẤY DANH SÁCH BÀI VIẾT
     */
    async findAllPosts(query: GetAllPostsDto, currentUserId?: string) {
        const { page = 1, limit = 10, mode = PostFeedMode.ALL } = query;
        const offset = (page - 1) * limit;

        // MODE 1: TRENDING - Ưu tiên Redis, sập thì dùng DB
        if (mode === PostFeedMode.TRENDING) {
            if (this.redisService.getClient().status === 'ready') {
                const trendingIds = await this.redisService.zrevrange('posts:trending', 0, limit - 1);
                if (trendingIds.length > 0) {
                    const posts = await this.fetchPostsDetails(trendingIds, currentUserId);
                    return { data: posts, meta: { page, limit, has_more: posts.length === limit } };
                }
            }
            return this.getTrendingFallback(limit, offset, currentUserId);
        }

        // MODE 2: FOLLOWING - Dùng Pull Model (SQL) để tiết kiệm Redis Request
        if (mode === PostFeedMode.FOLLOWING && currentUserId) {
            /**
             * TẠM THỜI DÙNG FALLBACK (SQL) LÀM CHÍNH ĐỂ TIẾT KIỆM REQUEST
             * Thay vì lấy từ Redis List, ta lấy thẳng từ DB dựa trên list người mình follow
             */
            return this.getFollowingFeedFallback(currentUserId, limit, offset, page);
        }

        // MODE 3: ALL
        const queryBuilder = this.knex(Collections.POSTS)
            .join(Collections.USERS, 'posts.author_id', 'users.id')
            .where({ 'posts.visibility': 'public' });

        const [{ count }] = await queryBuilder.clone().count('* as count');
        const posts = await queryBuilder
            .select(this.getPostSelectColumns(currentUserId))
            .orderBy('posts.created_at', 'desc')
            .limit(limit)
            .offset(offset);

        const mappedPosts = await this.mapFollowStatus(posts, currentUserId);

        return {
            data: mappedPosts,
            meta: { total: Number(count), page, limit, has_more: posts.length === limit }
        };
    }

    /**
     * PHÒNG TUYẾN DỰ PHÒNG: Lấy Feed trực tiếp từ DB (Pull Model)
     * Rất tiết kiệm Redis Request, chỉ gọi Redis 1 lần để lấy Following IDs
     */
    private async getFollowingFeedFallback(userId: string, limit: number, offset: number, page: number) {
        // Lấy danh sách người mình follow (Có cache Redis)
        const followingIds = await this.getFollowingIds(userId);
        
        if (followingIds.length === 0) {
            return { data: [], meta: { total: 0, page, limit, has_more: false } };
        }

        const queryBuilder = this.knex(Collections.POSTS)
            .join(Collections.USERS, 'posts.author_id', 'users.id')
            .whereIn('author_id', followingIds)
            .where({ 'posts.visibility': 'public' });

        const posts = await queryBuilder
            .select(this.getPostSelectColumns(userId))
            .orderBy('posts.created_at', 'desc')
            .limit(limit)
            .offset(offset);

        const mappedPosts = await this.mapFollowStatus(posts, userId);
        return { 
            data: mappedPosts, 
            meta: { 
                page, 
                limit, 
                has_more: posts.length === limit 
            } 
        };
    }

    /**
     * HÀM LẤY FEED TỪ REDIS (PUSH MODEL) - ĐANG TẠM DỪNG SỬ DỤNG
     */
    private async getFollowingFeed(userId: string, page: number, limit: number) {
        const feedKey = `user:feed:${userId}`;
        const offset = (page - 1) * limit;

        try {
            let postIds = await this.redisService.getClient().lrange(feedKey, offset, offset + limit - 1);
            if (postIds.length === 0 && page === 1) {
                postIds = await this.warmUpFollowingFeed(userId);
            }
            if (postIds.length === 0) return { data: [], meta: { total: 0, page, limit, has_more: false } };

            const posts = await this.fetchPostsDetails(postIds, userId);
            return { data: posts, meta: { page, limit, has_more: postIds.length === limit } };
        } catch (error: any) {
            this.logger.error(`Redis Feed error: ${error?.message}`);
            return { data: [], meta: { page, limit, has_more: false } };
        }
    }

    private async getTrendingFallback(limit: number, offset: number, currentUserId?: string) {
        const posts = await this.knex(Collections.POSTS)
            .join(Collections.USERS, 'posts.author_id', 'users.id')
            .select(this.getPostSelectColumns(currentUserId))
            .where({ 'posts.visibility': 'public' })
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);

        return { data: await this.mapFollowStatus(posts, currentUserId), meta: { page: 1, limit, has_more: posts.length === limit } };
    }

    /**
     * PHÁT TÁN BÀI VIẾT (FAN-OUT) - ĐANG TẠM DỪNG SỬ DỤNG
     */
    private async fanOutPost(authorId: string, postId: string) {
        if (this.redisService.getClient().status !== 'ready') return;
        
        await this.followService.getFollowStats(authorId); 
        const followersKey = `user:followers:${authorId}`;
        const followerIds = await this.redisService.smembers(followersKey);

        if (followerIds.length <= 1) return; 

        const pipeline = this.redisService.getClient().pipeline();
        followerIds.forEach(fId => {
            if (fId === 'CACHE_WORMED') return;
            const feedKey = `user:feed:${fId}`;
            pipeline.lpush(feedKey, postId);
            pipeline.ltrim(feedKey, 0, 499);
        });
        await pipeline.exec();
    }

    private async warmUpFollowingFeed(userId: string): Promise<string[]> {
        if (this.redisService.getClient().status !== 'ready') return [];
        
        const followingIds = await this.getFollowingIds(userId);
        if (followingIds.length === 0) return [];

        const posts = await this.knex(Collections.POSTS)
            .whereIn('author_id', followingIds)
            .where({ visibility: 'public' })
            .orderBy('created_at', 'desc')
            .limit(100) 
            .select('id');

        const postIds = posts.map(p => p.id);
        if (postIds.length > 0) {
            const feedKey = `user:feed:${userId}`;
            await this.redisService.getClient().rpush(feedKey, ...postIds);
            await this.redisService.getClient().expire(feedKey, 86400);
        }
        return postIds.slice(0, 10);
    }

    async reactionPost(userId: string, postId: string) {
        const existing = await this.findOneByCondition(Collections.POST_REACTIONS, { post_id: postId, user_id: userId });
        if (existing) {
            await this.delete(Collections.POST_REACTIONS, existing.id);
            if (this.redisService.getClient().status === 'ready') {
                this.redisService.zincrby('posts:trending', -1, postId);
            }
            return { is_liked: false };
        }
        await this.create(Collections.POST_REACTIONS, { id: randomUUID(), post_id: postId, user_id: userId, type: 'like' });
        
        if (this.redisService.getClient().status === 'ready') {
            this.redisService.zincrby('posts:trending', 1, postId);
        }

        const post = await this.findOneByCondition(Collections.POSTS, { id: postId });
        if (post && post.author_id !== userId) {
            this.eventEmitter.emit(NOTIFICATION_EVENTS.POST_LIKED, {
                actorId: userId,
                recipientId: post.author_id,
                postId,
            });
        }

        return { is_liked: true };
    }

    private getPostSelectColumns(currentUserId?: string) {
        const columns = [
            'posts.*',
            this.knex.raw(`jsonb_build_object('username', users.username, 'display_name', users.display_name, 'avatar_url', users.avatar_url) as author`),
            this.knex.raw(`COALESCE((SELECT jsonb_agg(m.*) FROM post_medias m WHERE m.post_id = posts.id), '[]'::jsonb) as medias`),
            this.knex(Collections.POST_REACTIONS).count('*').where({ 'post_id': this.knex.ref('posts.id') }).as('like_count'),
            this.knex(Collections.POST_COMMENTS).count('*').where({ 'post_id': this.knex.ref('posts.id') }).as('comment_count'),
            this.knex.raw(`
                COALESCE((
                    SELECT jsonb_agg(to_jsonb(highlight) ORDER BY highlight.reply_count DESC, highlight.created_at DESC)
                    FROM (
                        SELECT
                            pc.id,
                            pc.post_id,
                            pc.user_id,
                            pc.parent_id,
                            pc.content,
                            pc.depth,
                            pc.type,
                            pc.media_url,
                            pc.media_metadata,
                            pc.created_at,
                            pc.updated_at,
                            (
                                SELECT count(*)::int
                                FROM post_comments replies
                                WHERE replies.parent_id = pc.id
                            ) as reply_count,
                            jsonb_build_object(
                                'username', comment_users.username,
                                'display_name', comment_users.display_name,
                                'avatar_url', comment_users.avatar_url
                            ) as author
                        FROM post_comments pc
                        JOIN users comment_users ON pc.user_id = comment_users.id
                        WHERE pc.post_id = posts.id
                          AND pc.parent_id IS NULL
                        ORDER BY reply_count DESC, pc.created_at DESC
                        LIMIT 2
                    ) highlight
                ), '[]'::jsonb) as highlight_comments
            `),
        ];

        if (currentUserId) {
            columns.push(this.knex(Collections.POST_REACTIONS).count('*').where({ 'post_id': this.knex.ref('posts.id'), 'user_id': currentUserId }).as('is_liked'));
        } else {
            columns.push(this.knex.raw('0 as is_liked'));
        }
        return columns;
    }

    private async fetchPostsDetails(postIds: string[], currentUserId?: string) {
        const posts = await this.knex(Collections.POSTS)
            .join(Collections.USERS, 'posts.author_id', 'users.id')
            .whereIn('posts.id', postIds)
            .select(this.getPostSelectColumns(currentUserId))
            .orderByRaw(`posts.id = ANY(ARRAY[${postIds.map(id => `'${id}'`).join(',')}]::uuid[])`);

        return this.mapFollowStatus(posts, currentUserId);
    }

    private async mapFollowStatus(posts: any[], currentUserId?: string) {
        if (!currentUserId || posts.length === 0) {
            return posts.map(p => this.normalizePostResponse(p, false));
        }

        const authorIds = [...new Set(posts.map(p => p.author_id))];
        const followMap = await this.followService.batchIsFollowing(currentUserId, authorIds);
        return posts.map(p => this.normalizePostResponse(p, !!followMap[p.author_id]));
    }

    private normalizePostResponse(post: any, isFollowingAuthor: boolean) {
        return {
            ...post,
            is_following_author: isFollowingAuthor,
            like_count: Number(post.like_count || 0),
            comment_count: Number(post.comment_count || 0),
            is_liked: Number(post.is_liked || 0) > 0,
            highlight_comments: this.normalizeJsonArray(post.highlight_comments),
        };
    }

    private normalizeJsonArray(value: any) {
        if (Array.isArray(value)) return value;
        if (!value) return [];

        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }

        return [];
    }

    private async getFollowingIds(userId: string): Promise<string[]> {
        const redisKey = `user:following:${userId}`;
        
        if (this.redisService.getClient().status === 'ready') {
            const ids = await this.redisService.smembers(redisKey);
            if (ids.length > 0) return ids.filter(id => id !== 'CACHE_WORMED');
        }

        const follows = await this.knex(Collections.FOLLOWS).where({ follower_id: userId }).select('following_id');
        const ids = follows.map(f => f.following_id);
        
        if (ids.length > 0 && this.redisService.getClient().status === 'ready') {
            await this.redisService.sadd(redisKey, ...ids, 'CACHE_WORMED');
        }
        
        return ids;
    }
}
