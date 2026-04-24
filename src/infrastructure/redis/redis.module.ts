import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { AdaptiveCacheService } from "./adaptive-cache.service";

@Global()
@Module({
    providers: [RedisService, AdaptiveCacheService],
    exports: [RedisService, AdaptiveCacheService],
})
export class RedisModule { }