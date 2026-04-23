import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NOTIFICATION_EVENTS, NotificationType, PubSubEvent } from './enums/notifications.enum';
import { NotificationProvider } from './providers/notification.provider';
import { UsersService } from '../users/users.service';

@Injectable()
export class NotificationsListener {
    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly notificationProvider: NotificationProvider,
        private readonly usersService: UsersService,
    ) { }

    @OnEvent(NOTIFICATION_EVENTS.USER_FOLLOWED)
    async handleUserFollowed(payload: { followerId: string; followingId: string }) {

        //Get actor's name to create notification
        const actor = await this.usersService.findOneUser(payload.followerId);

        //Create notification for user who received the follow
        await this.notificationsService.createNotification({
            recipient_id: payload.followingId,
            actor_id: payload.followerId,
            type: NotificationType.FOLLOW,
            content: `${actor.display_name} (@${actor.username}) đã bắt đầu theo dõi bạn`,
        });

        this.notificationProvider.sendToUser(payload.followingId, PubSubEvent.NEW_NOTIFICATION, {
            type: NotificationType.FOLLOW,
            message: `${actor.display_name} đã bắt đầu theo dõi bạn`,
            actor: {
                id: actor.id,
                username: actor.username,
                display_name: actor.display_name,
                avatar_url: actor.avatar_url,
            },
            created_at: new Date(),
        });
    }

    @OnEvent(NOTIFICATION_EVENTS.POST_COMMENTED)
    async handlePostCommented(payload: { actorId: string; recipientId: string; postId: string; commentContent: string, parentId?: string }) {
        console.log('🔔 Processing notification for new comment...');

        // 1. Lấy thông tin người comment
        const actor = await this.usersService.findOneUser(payload.actorId);

        // 2. Lưu DB
        await this.notificationsService.createNotification({
            recipient_id: payload.recipientId,
            actor_id: payload.actorId,
            type: NotificationType.COMMENT,
            entity_id: payload.postId,
            content: payload.parentId
                ? `${actor.display_name} đã trả lời bình luận của bạn`
                : `${actor.display_name} đã bình luận về bài viết của bạn`,
        });

        // 3. Bắn Real-time
        this.notificationProvider.sendToUser(payload.recipientId, PubSubEvent.NEW_NOTIFICATION, {
            type: NotificationType.COMMENT,
            message: payload.parentId
                ? `${actor.display_name} đã trả lời bình luận của bạn`
                : `${actor.display_name} đã bình luận về bài viết của bạn`,
            actor: {
                id: actor.id,
                username: actor.username,
                display_name: actor.display_name,
                avatar_url: actor.avatar_url,
            },
            entity_id: payload.postId,
            created_at: new Date(),
        });
    }

}
