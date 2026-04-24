import { Global, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "./redis.service";
import { CCU_REDIS_KEY } from "@/common/interceptors/ccu.interceptor";

@Injectable()
export class AdaptiveCacheService {
    private readonly logger = new Logger(AdaptiveCacheService.name);
    private readonly threshold: number;

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService
    ) {
        this.threshold = this.configService.get<number>('app.memoryThreshold') || 50;
    }


    /**
     * Return the current number of active concurent requests (CCU)
     */
    async getCcu(): Promise<number> {
        try {
            const val = await this.redisService.getClient().get(CCU_REDIS_KEY);
            return val ? parseInt(val, 10) : 0;
        } catch (error) {
            return 0;
        }
    }


    /**
     * Check if we should enable caching based on CCU
     */
    async shouldCache(threshold?: number): Promise<boolean> {
        const ccu = await this.getCcu();

        const effectiveThreshold = threshold || this.threshold;

        return ccu >= effectiveThreshold;
    }

    	/**
	 * Cache-aside helper that activates caching only when CCU >= threshold.
	 *
	 * @param key       Redis cache key
	 * @param factory   Function that produces the actual data
	 * @param ttlMs     Cache TTL in milliseconds
	 * @param options   threshold: override CCU threshold; forceRefresh: bypass read cache
	 */
    async getOrSet<T> (
        key: string,
        factory: () => Promise<T>,
        ttlMs: number,
        options?: {
            threshold?: number;
            forceRefresh?: boolean;
        }
    ) {
        const { threshold, forceRefresh = false } = options ?? {};
		const cacheActive = await this.shouldCache(threshold);

        if(!forceRefresh && cacheActive) {
            try{
                const cached = await this.redisService.get(key);

                if(cached) {
                    return JSON.parse(cached) as T;
                }
            } catch (error) {
              this.logger.warn(`Cache read failed for key "${key}": ${error.message}`);
            }
        }
        
        const result = await factory();

        if(cacheActive) {
            try {
               await this.redisService.set(
                key,
                JSON.stringify(result),
                ttlMs
               )
            } catch (error) {
              this.logger.warn(`Failed to write cache key "${key}": ${error.message}`);
            }
        }

        return result;
    } 
}