import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { BaseRepository } from '@/infrastructure/repositories/base.repository';
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { CreatePostDto } from './dtos/create-post.dto';
import { randomUUID } from 'crypto';
import { Collections } from '@/common/enums/collections.enum';
import { GetAllPostsDto, PostFeedMode } from './dtos/get-all-post.dto';
import { AdaptiveCacheService } from '@/infrastructure/redis/adaptive-cache.service';
import { RedisService } from '@/infrastructure/redis/redis.service';
import { FollowsService } from '../follows/follows.service';

@Injectable()
export class PostsService extends BaseRepository {
    constructor(
        @Inject(KNEX_CONNECTION) knex: Knex,
        private readonly adaptiveCacheService: AdaptiveCacheService,
        private readonly redisService: RedisService,
        private readonly followService: FollowsService
    ) {
        super(knex);
    }

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

            // Clear cache
            this.redisService.removeKeysByPrefix('posts:all');

            return post;
        })
    }

    async findAllPosts(query: GetAllPostsDto, currentUserId?: string) {
        const { page = 1, limit = 10, mode = PostFeedMode.ALL } = query;
        const offset = (page - 1) * limit;

        if (mode === PostFeedMode.TRENDING) {
            return this.getTrendingPosts(limit, currentUserId);
        }

        const cacheKey = `posts:all:${JSON.stringify(query)}`;
        return this.adaptiveCacheService.getOrSet(
            cacheKey,
            async () => {
                // 1. Query lấy tổng số lượng bản ghi để phân trang
                const [{ count }] = await this.knex(Collections.POSTS)
                    .where({ visibility: 'public' })
                    .count('* as count');

                const totalItems = Number(count);
                const totalPages = Math.ceil(totalItems / limit);

                // 2. Query lấy dữ liệu chính (Dùng JSON Aggregation)
                const queryBuilder = this.knex(Collections.POSTS)
                    .join(Collections.USERS, 'posts.author_id', 'users.id');

                if (mode === PostFeedMode.FOLLOWING && currentUserId) {
                    const followingIds = await this.getFollowingIds(currentUserId);
                    if (followingIds.length > 0) {
                        queryBuilder.whereIn('author_id', followingIds)
                    } else {
                        return {
                            data: [],
                            meta: {
                                total: 0,
                                page: page,
                                limit: limit,
                                total_pages: 0,
                                has_more: false
                            }
                        }
                    }

                }

                const selectColumns = [
                    'posts.*',
                    // Author object
                    this.knex.raw(`
                        jsonb_build_object(
                            'username', users.username,
                            'display_name', users.display_name,
                            'avatar_url', users.avatar_url
                        ) as author
                    `),
                    // Medias array
                    this.knex.raw(`
                        COALESCE(
                            (SELECT jsonb_agg(m.*) 
                             FROM post_medias m 
                             WHERE m.post_id = posts.id),
                            '[]'::jsonb
                        ) as medias
                    `),
                    // Like count
                    this.knex(Collections.POST_REACTIONS)
                        .count('*')
                        .where({ 'post_id': this.knex.ref('posts.id') })
                        .as('like_count'),
                ];

                if (currentUserId) {
                    const isLikedSubquery = this.knex(Collections.POST_REACTIONS)
                        .count('*')
                        .where({
                            'post_id': this.knex.ref('posts.id'),
                            'user_id': currentUserId
                        })
                        .as('is_liked');
                    selectColumns.push(isLikedSubquery);
                } else {
                    selectColumns.push(this.knex.raw('0 as is_liked'));
                }

                const posts = await queryBuilder
                    .select(selectColumns)
                    .where({ 'posts.visibility': 'public' })
                    .orderBy('posts.created_at', 'desc')
                    .limit(limit)
                    .offset(offset);

                return {
                    data: posts.map(p => ({
                        ...p,
                        like_count: Number(p.like_count),
                        is_liked: Number(p.is_liked) > 0
                    })),
                    meta: {
                        total: totalItems,
                        page: page,
                        limit: limit,
                        total_pages: totalPages,
                        has_more: page < totalPages
                    }
                };

            },
            300
        )
    }

    async reactionPost(userId: string, postId: string) {
        const existing = await this.findOneByCondition(Collections.POST_REACTIONS, { post_id: postId, user_id: userId });
        if (existing) {
            await this.delete(Collections.POST_REACTIONS, existing.id);
            this.redisService.zincrby('posts:trending', -1, postId);
            return { is_liked: false };
        }
        await this.create(Collections.POST_REACTIONS, {
            id: randomUUID(),
            post_id: postId,
            user_id: userId,
            type: 'like',
        });

        this.redisService.zincrby('posts:trending', 1, postId);
        return { is_liked: true };
    }
    async getTrendingPosts(limit: number = 10, currentUserId?: string) {
        const trendingIds = await this.redisService.zrevrange('posts:trending', 0, limit - 1);
        if (trendingIds.length === 0) return [];

        // 1. Tạo mảng selectColumns giống findAllPosts
        const selectColumns: any[] = [
            'posts.*',
            this.knex.raw(`jsonb_build_object('username', users.username, 'display_name', users.display_name, 'avatar_url', users.avatar_url) as author`),
            this.knex.raw(`COALESCE((SELECT jsonb_agg(m.*) FROM post_medias m WHERE m.post_id = posts.id), '[]'::jsonb) as medias`),
            this.knex(Collections.POST_REACTIONS).count('*').where({ 'post_id': this.knex.ref('posts.id') }).as('like_count'),
        ];

        // 2. Thêm logic check is_liked nếu có currentUserId
        if (currentUserId) {
            selectColumns.push(
                this.knex(Collections.POST_REACTIONS)
                    .count('*')
                    .where({ 'post_id': this.knex.ref('posts.id'), 'user_id': currentUserId })
                    .as('is_liked')
            );
        } else {
            selectColumns.push(this.knex.raw('0 as is_liked'));
        }

        const posts = await this.knex(Collections.POSTS)
            .join(Collections.USERS, 'posts.author_id', 'users.id')
            .whereIn('posts.id', trendingIds)
            .select(selectColumns)
            .orderByRaw(`posts.id = ANY(ARRAY[${trendingIds.map(id => `'${id}'`).join(',')}]::uuid[])`);

        return posts.map(p => ({
            ...p,
            like_count: Number(p.like_count),
            is_liked: Number(p.is_liked) > 0
        }));
    }

    private async getFollowingIds(userId: string): Promise<string[]> {
        const redisKey = `user:following:${userId}`;
        let ids = await this.redisService.smembers(redisKey);
        // Nếu Redis trống, hãy lấy từ DB "cứu" dữ liệu
        if (ids.length === 0) {
            const follows = await this.knex(Collections.FOLLOWS)
                .where({ follower_id: userId })
                .select('following_id');

            ids = follows.map(f => f.following_id);
            // Nạp lại vào Redis cho lần sau nhanh
            if (ids.length > 0) {
                await this.redisService.sadd(redisKey, ...ids);
            }
        }
        return ids;
    }
}
