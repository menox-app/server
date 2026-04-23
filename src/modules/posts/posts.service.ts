import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { BaseRepository } from '@/infrastructure/repositories/base.repository';
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { CreatePostDto } from './dtos/create-post.dto';
import { randomUUID } from 'crypto';
import { Collections } from '@/common/enums/collections.enum';
import { GetAllPostsDto, PostFeedMode } from './dtos/get-all-post.dto';

@Injectable()
export class PostsService extends BaseRepository {
    constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
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

            return post;
        })
    }

    async findAllPosts(query: GetAllPostsDto, currentUserId?: string) {
        console.log("🚀 ~ PostsService ~ findAllPosts ~ currentUserId:", currentUserId)
        const { page = 1, limit = 10, mode = PostFeedMode.ALL } = query;
        const offset = (page - 1) * limit;

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
            queryBuilder.whereIn('author_id', (qb) => {
                qb.select('following_id')
                    .from(Collections.FOLLOWS)
                    .where({ follower_id: currentUserId })
            })
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
    }

    async reactionPost(userId: string, postId: string) {
        const existing = await this.findOneByCondition(Collections.POST_REACTIONS, { post_id: postId, user_id: userId });
        if (existing) {
            await this.delete(Collections.POST_REACTIONS, existing.id);
            return { is_liked: false };
        }
        await this.create(Collections.POST_REACTIONS, {
            id: randomUUID(),
            post_id: postId,
            user_id: userId,
            type: 'like',
        });
        return { is_liked: true };
    }
}
