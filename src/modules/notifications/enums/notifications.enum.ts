export const NOTIFICATION_EVENTS = {
    USER_FOLLOWED: 'user.followed',
    POST_COMMENTED: 'post.commented',
    POST_LIKED: 'post.liked',
};

export enum NotificationType {
    FOLLOW = 'FOLLOW',
    COMMENT = 'COMMENT',
    LIKE = 'LIKE',
}
export enum PubSubEvent {
    NEW_NOTIFICATION = 'new_notification',
}