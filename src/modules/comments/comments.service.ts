import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { BaseRepository } from '@/infrastructure/repositories/base.repository';
import { Collections } from '@/common/enums/collections.enum';
import { GetCommentsDto } from './dtos/get-comments-dto';

@Injectable()
export class CommentsService extends BaseRepository {
    constructor(
        @Inject(KNEX_CONNECTION) knex: Knex,
    ) {
        super(knex);
    }

    async createComment(userId: string, dto: CreateCommentDto) {
        const { post_id, content, parent_id, type, media_url, media_metadata } = dto;
        let depth = 0;

        if (parent_id) {
            const parentComment = await this.findOneByCondition(Collections.POST_COMMENTS, { id: parent_id });
            if (!parentComment) {
                throw new NotFoundException('Parent comment not found');
            }
            depth = parentComment.depth + 1;
        }

        const [comment] = await this.knex(Collections.POST_COMMENTS).insert({
            user_id: userId,
            post_id,
            content,
            parent_id,
            type,
            media_url,
            media_metadata: media_metadata ? JSON.stringify(media_metadata) : null,
            depth,
        }).returning('*');

        return comment;
    }

    async findAllComments(postId: string, query: GetCommentsDto) {
        const { page = 1, limit = 10, parent_id } = query;
        const offset = (page - 1) * limit;

        const queryBuilder = this.knex(Collections.POST_COMMENTS)
            .where({ post_id: postId });

        if (parent_id) {
            queryBuilder.where({ parent_id });
        } else {
            queryBuilder.whereNull('parent_id');
        }

        const [{ count }] = await queryBuilder.clone().count('* as count');
        const total = Number(count);
        const total_pages = Math.ceil(total / limit);

        const data = await queryBuilder
            .join(Collections.USERS, 'post_comments.user_id', 'users.id')
            .select([
                'post_comments.*',
                // 👤 Tác giả chính
                this.knex.raw(`
                jsonb_build_object(
                    'username', users.username,
                    'display_name', users.display_name,
                    'avatar_url', users.avatar_url
                ) as author
            `),
                // 🔁 Tên người được reply
                this.knex.raw(`
                (SELECT u2.username FROM post_comments pc2 
                 JOIN users u2 ON pc2.user_id = u2.id 
                 WHERE pc2.id = post_comments.parent_id) as reply_to_username
            `),
                // 🔢 Tổng số lượng phản hồi
                this.knex.raw(`
                (SELECT count(*)::int FROM post_comments pc3 
                 WHERE pc3.parent_id = post_comments.id) as reply_count
            `),
                // ✨ THỰC THI ĐỀ XUẤT: Preview 2 phản hồi đầu tiên kèm Tác giả (dạng mảng JSON)
                this.knex.raw(`
                (
                    SELECT json_agg(preview)
                    FROM (
                        SELECT 
                            p.*,
                            json_build_object(
                                'username', u_p.username,
                                'display_name', u_p.display_name,
                                'avatar_url', u_p.avatar_url
                            ) as author
                        FROM post_comments p
                        JOIN users u_p ON p.user_id = u_p.id
                        WHERE p.parent_id = post_comments.id
                        ORDER BY p.created_at ASC
                        LIMIT 2
                    ) preview
                ) as replies
            `)
            ])
            .orderBy('post_comments.created_at', 'desc')
            .limit(limit)
            .offset(offset);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                total_pages,
                has_more: page < total_pages
            }
        };
    }


}
