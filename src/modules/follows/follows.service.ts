import { Collections } from '@/common/enums/collections.enum';
import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { BaseRepository } from '@/infrastructure/repositories/base.repository';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Knex } from 'knex';
import { NOTIFICATION_EVENTS } from '../notifications/enums/notifications.enum';
import { RedisService } from '@/infrastructure/redis/redis.service';

@Injectable()
export class FollowsService extends BaseRepository {
    constructor(
        @Inject(KNEX_CONNECTION) knex: Knex,
        private readonly eventEmitter: EventEmitter2,
        private readonly redisService: RedisService
    ) {
        super(knex);
    }

    async follow(followerId: string, followingId: string) {
        // Kiểm tra user hiện tại và user cần follow
        if (followerId === followingId) {
            throw new BadRequestException('You cannot follow yourself');
        }

        // Kiểm tra user cần follow có tồn tại không
        const targetUser = await this.findOneByCondition(Collections.USERS, { id: followingId });
        if (!targetUser) {
            throw new NotFoundException('User not found');
        }

        // Tạo redisKey
        const redisKey = `user:following:${followerId}`;

        // Kiểm tra user đã follow chưa
        const existingFollow = await this.findOneByCondition(Collections.FOLLOWS, { follower_id: followerId, following_id: followingId });
        if (existingFollow) {
            // Unfollow
            await this.knex(Collections.FOLLOWS)
                .where({ follower_id: followerId, following_id: followingId })
                .delete();

            // Xóa khỏi redis
            await Promise.all([
                this.redisService.srem(`user:following:${followerId}`, followingId),
                this.redisService.srem(`user:followers:${followingId}`, followerId),
            ]);

            return { message: 'Unfollowed successfully', is_following: false };
        }

        // Follow
        await this.create(Collections.FOLLOWS, {
            follower_id: followerId,
            following_id: followingId,
        });

        // Add vào redis
        await Promise.all([
            this.redisService.sadd(`user:following:${followerId}`, followingId),
            this.redisService.sadd(`user:followers:${followingId}`, followerId),
        ]);

        // Emit sự kiện
        this.eventEmitter.emit(NOTIFICATION_EVENTS.USER_FOLLOWED, {
            followerId,
            followingId
        });

        return { message: 'Followed successfully', is_following: true };
    }

    async isFollowing(followerId: string, followingId: string) {
        const redisKey = `user:following:${followerId}`;

        // Check trong redis
        const isMember = await this.redisService.isMember(redisKey, followingId);
        if (isMember) return true;

        // Check trong db
        const exists = await this.findOneByCondition(Collections.FOLLOWS,
            {
                follower_id: followerId,
                following_id: followingId
            });

        if (exists) {
            await this.redisService.sadd(redisKey, followingId);
            return true;
        }

        return false;
    }
}
