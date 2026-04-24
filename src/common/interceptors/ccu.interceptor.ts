import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { RedisService } from 'src/infrastructure/redis/redis.service';

// Global key for storing active concurrent users in Redis
export const CCU_REDIS_KEY = 'ccu:active';
// TTL for the key to ensure it auto-resets if the server crashes
const CCU_TTL_SECONDS = 60; 

@Injectable()
export class CcuInterceptor implements NestInterceptor {
    private readonly logger = new Logger(CcuInterceptor.name);
    private readonly alertThreshold: number;

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService
    ) {
        // Load the alert threshold from app configuration
        this.alertThreshold = this.configService.get<number>('app.alertThreshold') || 500;
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const client = this.redisService.getClient();

        /**
         * STEP 1: On Request Start
         * Increment the CCU counter and refresh the TTL
         */
        client.incr(CCU_REDIS_KEY).then(async currentCcu => {
            // Set expiration to prevent stale data if the server shuts down unexpectedly
            await client.expire(CCU_REDIS_KEY, CCU_TTL_SECONDS);

            // Trigger an alert if the CCU exceeds the pre-defined safety threshold
            if (currentCcu >= this.alertThreshold) {
                this.logger.warn(`🔥 HIGH TRAFFIC ALERT: Current CCU is ${currentCcu}, exceeding threshold of ${this.alertThreshold}!`);
            }
        }).catch(err => this.logger.warn('CCU Increment error', err?.message));

        /**
         * STEP 2: On Request End (using finalize)
         * Decrement the CCU counter regardless of success or failure
         */
        return next.handle().pipe(
            finalize(() => {
                client.decr(CCU_REDIS_KEY).then((val) => {
                    // Safety check: reset to 0 if the counter somehow drifts below zero
                    if (val < 0) client.set(CCU_REDIS_KEY, '0');
                }).catch(() => { });
            }),
        );
    }
}
