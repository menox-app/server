import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';
import { randomUUID } from 'crypto';
import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { BaseRepository } from '@/infrastructure/repositories/base.repository';
import { Collections } from '@/common/enums/collections.enum';
import { GetCommentsDto } from './dtos/get-comments-dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notifications/enums/notifications.enum';

@Injectable()
export class CommentsService extends BaseRepository {
    constructor(
        @Inject(KNEX_CONNECTION) knex: Knex,
        private eventEmitter: EventEmitter2
    ) {
        super(knex);
    }

    async createComment(userId: string, dto: CreateCommentDto) {
        const { post_id, parent_id } = dto;
        const content = dto.content?.trim() || '';
        const medias = dto.medias || [];
        let depth = 0;

        if (!content && medias.length === 0) {
            throw new BadRequestException('Comment content or media is required');
        }

        const post = await this.knex(Collections.POSTS).where({ id: post_id }).first();
        if (!post) {
            throw new NotFoundException('Post not found');
        }

        // Check parent comment
        if (parent_id) {
            const parentComment = await this.findOneByCondition(Collections.POST_COMMENTS, { id: parent_id });
            if (!parentComment) {
                throw new NotFoundException('Parent comment not found');
            }
            if (parentComment.post_id !== post_id) {
                throw new BadRequestException('Parent comment does not belong to this post');
            }
            depth = parentComment.depth + 1;
        }

        const comment = await this.transaction(async (trx) => {
            const [createdComment] = await trx(Collections.POST_COMMENTS).insert({
                user_id: userId,
                post_id,
                content,
                parent_id,
                depth,
            }).returning('*');

            if (medias.length > 0) {
                const mediaIds = [...new Set(medias.map((media) => media.mediaId))];
                const mediaRowsById = new Map<string, any>();

                const ownedMediaRows = await trx(Collections.MEDIA)
                    .whereIn('id', mediaIds)
                    .where({ user_id: userId })
                    .where({ status: 'ready' })
                    .whereNull('deleted_at')
                    .select('*');

                if (ownedMediaRows.length !== mediaIds.length) {
                    throw new BadRequestException('One or more media files are invalid');
                }

                ownedMediaRows.forEach((row) => mediaRowsById.set(row.id, row));

                const mediaData = medias.map((media, index) => {
                    const uploadedMedia = mediaRowsById.get(media.mediaId);
                    const mimeType = uploadedMedia.mime_type || '';
                    const mediaType = uploadedMedia.type || (mimeType.startsWith('video')
                        ? 'video'
                        : mimeType.startsWith('audio')
                            ? 'audio'
                            : mimeType === 'image/gif'
                                ? 'gif'
                                : mimeType.startsWith('image')
                                    ? 'image'
                                    : 'file');

                    return {
                        id: randomUUID(),
                        comment_id: createdComment.id,
                        media_id: uploadedMedia.id,
                        url: uploadedMedia.url,
                        public_id: uploadedMedia.remote_id || null,
                        type: mediaType,
                        mime_type: uploadedMedia.mime_type || null,
                        thumbnail_url: null,
                        metadata: uploadedMedia.metadata || null,
                        sort_order: media.order ?? index,
                    };
                });

                await trx(Collections.COMMENT_MEDIAS).insert(mediaData);
            }

            const commentMedias = medias.length > 0
                ? await trx(Collections.COMMENT_MEDIAS)
                    .where({ comment_id: createdComment.id })
                    .orderBy('sort_order', 'asc')
                : [];

            return {
                ...createdComment,
                medias: commentMedias,
            };
        });

        if (post.author_id !== userId) {
            this.eventEmitter.emit(NOTIFICATION_EVENTS.POST_COMMENTED, {
                actorId: userId,
                recipientId: post.author_id,
                postId: post_id,
                commentContent: content,
                parentId: parent_id,
            });
        }

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
                    SELECT COALESCE(json_agg(media ORDER BY media.sort_order ASC, media.created_at ASC), '[]'::json)
                    FROM (
                        SELECT cm.*
                        FROM comment_medias cm
                        WHERE cm.comment_id = post_comments.id
                    ) media
                ) as medias
            `),
                this.knex.raw(`
                (
                    SELECT json_agg(preview)
                    FROM (
                        SELECT 
                            p.*,
                            (
                                SELECT COALESCE(json_agg(reply_media ORDER BY reply_media.sort_order ASC, reply_media.created_at ASC), '[]'::json)
                                FROM (
                                    SELECT cm_r.*
                                    FROM comment_medias cm_r
                                    WHERE cm_r.comment_id = p.id
                                ) reply_media
                            ) as medias,
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
