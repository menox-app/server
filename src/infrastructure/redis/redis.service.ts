import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private redisClient: Redis;
    private isShuttingDown = false;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const redisUrl = this.configService.get<string>('redis.url') || 'redis://localhost:6379';

        this.redisClient = new Redis(redisUrl, {
            connectTimeout: 10000,
            maxRetriesPerRequest: 3,

        })

        this.redisClient.on('connect', () => {
            this.logger.log('Redis connected');
        })

        this.redisClient.on('error', (err) => {
            if (this.isShuttingDown) return;

            this.logger.error(`Redis connection error: ${err}`);

            if (err.message.includes('Socket closed unexpectedly') ||
                err.message.includes('Connection is closed')
            ) {
                this.logger.warn('Redis connection lost, will auto reconnect...');

            }
        })

        this.redisClient.on('ready', () => {
            this.logger.log('Redis ready');
        });

        this.redisClient.on('reconnecting', (time) => {
            this.logger.log(`Redis reconnecting in ${time}ms`);
        });

        this.redisClient.on('close', () => {
            if (!this.isShuttingDown) {
                this.logger.warn('Redis connection closed');
            }
        });
    }

    async onModuleDestroy() {
        this.isShuttingDown = true;
        if (this.redisClient) {
            try {
                await this.redisClient.quit();
            } catch (error) {
                this.logger.warn('Error during Redis shutdown, forcing disconnect');
                this.redisClient.disconnect();
            }
        }
    }

    async set(key: string, value: string, ttl?: number) {
        if (ttl) {
            await this.redisClient.set(key, value, 'EX', ttl);
        } else {
            await this.redisClient.set(key, value);
        }
    }

    getClient(): Redis {
        return this.redisClient;
    }

    async get(key: string) {
        return await this.redisClient.get(key);
    }

    async del(key: string) {
        await this.redisClient.del(key);
    }

    /**
 * =========================
 * 1. Nhóm SETS (Dùng cho Follower/Following/Like)
 * =========================
 */

    // Thêm một ID vào Set (ví dụ: User A follow User B)
    async sadd(key: string, ...member: string[]) {
        return await this.redisClient.sadd(key, ...member);
    }

    // Xóa một ID khỏi Set (ví dụ: Unfollow)
    async srem(key: string, ...member: string[]) {
        return await this.redisClient.srem(key, ...member);
    }

    // Lấy toàn bộ thành viên trong Set
    async smembers(key: string): Promise<string[]> {
        return await this.redisClient.smembers(key);
    }

    // Kiểm tra nhanh sự tồn tại (ví dụ: User A đã follow User B chưa?)
    async isMember(key: string, member: string): Promise<boolean> {
        const result = await this.redisClient.sismember(key, member);
        return result === 1;
    }

    // Đếm tổng số lượng (ví dụ: Đếm tổng Follower)
    async scard(key: string): Promise<number> {
        return await this.redisClient.scard(key);
    }

    /**
     * =========================
     * 2. Nhóm SORTED SETS (Dùng cho Feed/Bảng xếp hạng)
     * =========================
     */

    // Thêm bài viết vào Feed với điểm số (thường là Timestamp)
    async zadd(key: string, score: number, member: string) {
        return await this.redisClient.zadd(key, score, member);
    }

    // Lấy danh sách bài viết từ mới nhất đến cũ nhất (Phân trang)
    async zrevrange(key: string, start: number, end: number) {
        return await this.redisClient.zrevrange(key, start, end);
    }

    async zincrby(key: string, increment: number, member: string) {
    return await this.redisClient.zincrby(key, increment, member);
}

    /**
     * =========================
     * 3. Nhóm HASHES (Dùng lưu trữ Object chi tiết)
     * =========================
     */

    // Lưu toàn bộ Object vào Hash (Tiết kiệm RAM hơn stringify)
    async hset(key: string, value: Record<string, any>) {
        return await this.redisClient.hset(key, value);
    }

    // Lấy toàn bộ Object từ Hash
    async hgetall(key: string) {
        return await this.redisClient.hgetall(key);
    }

    // Remove all key by prefix
    async removeKeysByPrefix(prefix: string): Promise<number> {
        this.logger.log(`Removing keys with prefix: ${prefix}`);

        let deletedCount = 0;
        let cursor = '0';
        const batchSize = 100; // Process keys in batches to avoid memory issues

        do {
            try {
                // Use SCAN instead of KEYS for better performance and to avoid blocking
                const result = await this.redisClient.scan(
                    cursor,
                    'MATCH',
                    `${prefix}*`,
                    'COUNT',
                    1000, // Scan 1000 keys per iteration
                );

                cursor = result[0];
                const keys = result[1];

                if (keys.length > 0) {
                    this.logger.debug(
                        `Found ${keys.length} keys to delete with prefix: ${prefix}`,
                    );

                    // Process keys in smaller batches to avoid "too many arguments" error
                    for (let i = 0; i < keys.length; i += batchSize) {
                        const batch = keys.slice(i, i + batchSize);
                        const deleted = await this.redisClient.del(...batch);
                        deletedCount += deleted;
                    }
                }
            } catch (error) {
                this.logger.error(`Error removing keys with prefix ${prefix}:`, error);
                break;
            }
        } while (cursor !== '0');

        this.logger.log(
            `Successfully deleted ${deletedCount} keys with prefix: ${prefix}`,
        );
        return deletedCount;
    }
}