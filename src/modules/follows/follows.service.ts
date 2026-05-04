import { Collections } from '@/common/enums/collections.enum';
import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { BaseRepository } from '@/infrastructure/repositories/base.repository';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Knex } from 'knex';
import { NOTIFICATION_EVENTS } from '../notifications/enums/notifications.enum';
import { RedisService } from '@/infrastructure/redis/redis.service';

@Injectable()
export class FollowsService extends BaseRepository {
    private readonly logger = new Logger(FollowsService.name);

    constructor(
        @Inject(KNEX_CONNECTION) knex: Knex,
        private readonly eventEmitter: EventEmitter2,
        private readonly redisService: RedisService
    ) {
        super(knex);
    }

    async follow(followerId: string, followingId: string) {
        if (followerId === followingId) {
            throw new BadRequestException('You cannot follow yourself');
        }

        const targetUser = await this.findOneByCondition(Collections.USERS, { id: followingId });
        if (!targetUser) {
            throw new NotFoundException('User not found');
        }

        const existingFollow = await this.findOneByCondition(Collections.FOLLOWS, { follower_id: followerId, following_id: followingId });
        
        if (existingFollow) {
            // Unfollow logic
            await this.knex(Collections.FOLLOWS)
                .where({ follower_id: followerId, following_id: followingId })
                .delete();

            await this.ignoreRedisErrors(() => Promise.all([
                this.redisService.srem(`user:following:${followerId}`, followingId),
                this.redisService.srem(`user:followers:${followingId}`, followerId),
            ]));

            return { message: 'Unfollowed successfully', is_following: false };
        }

        // Follow logic
        await this.create(Collections.FOLLOWS, {
            follower_id: followerId,
            following_id: followingId,
        });

        // Add vào redis (Đảm bảo cache đã được warmed up để tránh mất dữ liệu cũ)
        await this.ignoreRedisErrors(() => Promise.all([
            this.ensureFollowingCache(followerId),
            this.ensureFollowersCache(followingId)
        ]));

        await this.ignoreRedisErrors(() => Promise.all([
            this.redisService.sadd(`user:following:${followerId}`, followingId),
            this.redisService.sadd(`user:followers:${followingId}`, followerId),
        ]));

        this.eventEmitter.emit(NOTIFICATION_EVENTS.USER_FOLLOWED, {
            followerId,
            followingId
        });

        return { message: 'Followed successfully', is_following: true };
    }

    async isFollowing(followerId: string, followingId: string) {
        if (!this.isRedisReady()) {
            const existingFollow = await this.findOneByCondition(Collections.FOLLOWS, {
                follower_id: followerId,
                following_id: followingId,
            });
            return !!existingFollow;
        }

        const redisKey = `user:following:${followerId}`;
        
        // Warm up cache first
        await this.ensureFollowingCache(followerId);

        return await this.redisService.isMember(redisKey, followingId);
    }

    async batchIsFollowing(followerId: string, followingIds: string[]): Promise<Record<string, boolean>> {
        if (!followerId || followingIds.length === 0) return {};

        if (!this.isRedisReady()) {
            return this.batchIsFollowingFromDatabase(followerId, followingIds);
        }

        await this.ensureFollowingCache(followerId);

        const redisKey = `user:following:${followerId}`;
        const pipeline = this.redisService.getClient().pipeline();

        followingIds.forEach(id => {
            pipeline.sismember(redisKey, id);
        });

        const results = await pipeline.exec();
        const followMap: Record<string, boolean> = {};

        followingIds.forEach((id, index) => {
            if (results && results[index]) {
                followMap[id] = results[index][1] === 1;
            } else {
                followMap[id] = false;
            }
        });

        return followMap;
    }

    async getFollowStats(userId: string) {
        if (!this.isRedisReady()) {
            const [followingRow, followersRow] = await Promise.all([
                this.knex(Collections.FOLLOWS).where({ follower_id: userId }).count('* as count').first(),
                this.knex(Collections.FOLLOWS).where({ following_id: userId }).count('* as count').first(),
            ]);

            return {
                following_count: Number(followingRow?.count || 0),
                followers_count: Number(followersRow?.count || 0)
            };
        }

        await Promise.all([
            this.ensureFollowingCache(userId),
            this.ensureFollowersCache(userId)
        ]);

        const followingKey = `user:following:${userId}`;
        const followersKey = `user:followers:${userId}`;

        const [followingCount, followersCount] = await Promise.all([
            this.redisService.getClient().scard(followingKey),
            this.redisService.getClient().scard(followersKey)
        ]);

        // Trừ đi 1 nếu có marker CACHE_WORMED
        const adjustCount = (count: number) => Math.max(0, count - 1);

        return {
            following_count: adjustCount(followingCount),
            followers_count: adjustCount(followersCount)
        };
    }

    async getMutualFollows(user1Id: string, user2Id: string): Promise<string[]> {
        if (!this.isRedisReady()) {
            const rows = await this.knex(`${Collections.FOLLOWS} as f1`)
                .join(`${Collections.FOLLOWS} as f2`, 'f1.following_id', 'f2.following_id')
                .where('f1.follower_id', user1Id)
                .where('f2.follower_id', user2Id)
                .select('f1.following_id');

            return rows.map((row) => row.following_id);
        }

        await Promise.all([
            this.ensureFollowingCache(user1Id),
            this.ensureFollowingCache(user2Id)
        ]);

        const key1 = `user:following:${user1Id}`;
        const key2 = `user:following:${user2Id}`;
        const mutualIds = await this.redisService.getClient().sinter(key1, key2);
        
        return mutualIds.filter(id => id !== 'CACHE_WORMED');
    }

    /**
     * Ensures "Following" cache is warmed up
     */
    private async ensureFollowingCache(userId: string): Promise<void> {
        if (!this.isRedisReady()) return;

        const redisKey = `user:following:${userId}`;
        const exists = await this.redisService.getClient().exists(redisKey);

        if (exists === 0) {
            const follows = await this.knex(Collections.FOLLOWS)
                .where({ follower_id: userId })
                .select('following_id');

            const ids = follows.map(f => f.following_id);
            
            // Luôn thêm marker để đánh dấu cache đã được xử lý
            await this.redisService.getClient().sadd(redisKey, 'CACHE_WORMED');
            if (ids.length > 0) {
                await this.redisService.getClient().sadd(redisKey, ...ids);
            }
            await this.redisService.getClient().expire(redisKey, 86400);
        }
    }

    /**
     * Ensures "Followers" cache is warmed up
     */
    private async ensureFollowersCache(userId: string): Promise<void> {
        if (!this.isRedisReady()) return;

        const redisKey = `user:followers:${userId}`;
        const exists = await this.redisService.getClient().exists(redisKey);

        if (exists === 0) {
            const follows = await this.knex(Collections.FOLLOWS)
                .where({ following_id: userId })
                .select('follower_id');

            const ids = follows.map(f => f.follower_id);

            await this.redisService.getClient().sadd(redisKey, 'CACHE_WORMED');
            if (ids.length > 0) {
                await this.redisService.getClient().sadd(redisKey, ...ids);
            }
            await this.redisService.getClient().expire(redisKey, 86400);
        }
    }

    private async batchIsFollowingFromDatabase(followerId: string, followingIds: string[]): Promise<Record<string, boolean>> {
        const uniqueFollowingIds = [...new Set(followingIds)];
        const rows = await this.knex(Collections.FOLLOWS)
            .where({ follower_id: followerId })
            .whereIn('following_id', uniqueFollowingIds)
            .select('following_id');

        const followedIds = new Set(rows.map((row) => row.following_id));
        return followingIds.reduce<Record<string, boolean>>((acc, id) => {
            acc[id] = followedIds.has(id);
            return acc;
        }, {});
    }

    private isRedisReady(): boolean {
        return this.redisService.getClient().status === 'ready';
    }

    private async ignoreRedisErrors<T>(factory: () => Promise<T>): Promise<T | undefined> {
        if (!this.isRedisReady()) return undefined;

        try {
            return await factory();
        } catch (error: any) {
            this.logger.warn(`Redis cache operation skipped: ${error?.message || error}`);
            return undefined;
        }
    }
}
