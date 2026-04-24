import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { KnexModule } from './knex/knex.module';
import { RedisModule } from './redis/redis.module';
import { CloudinaryProvider } from './storage/providers/cloudinary.provider';
import { StorageProvider } from './storage/storage.provider';

@Global()
@Module({
  imports: [
    // Database (Postgres with Knex)
    KnexModule,
    
    // Cache & Social Infrastructure (Redis)
    RedisModule,
    
    // Internal Event System
    EventEmitterModule.forRoot(),
    
    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
        blockDuration: 60000,
      },
    ]),

    // Logging (Winston)
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('app.env') === 'production';

        const transports: winston.transport[] = [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              winston.format.printf(
                ({ timestamp, level, message, context, trace }) => {
                  return `${timestamp} [${level}] ${context ? `[${context}] ` : ''}${message}${trace ? `\n${trace}` : ''}`;
                },
              ),
            ),
          }),
        ];

        if (!isProduction) {
          transports.push(
            new (winston.transports as any).DailyRotateFile({
              filename: 'logs/application-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              zippedArchive: true,
              maxSize: '20m',
              maxFiles: '14d',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
            }),
          );
        }

        return { transports };
      },
    }), 
  ],
  providers: [
    // Storage (Cloudinary)
    {
      provide: StorageProvider,
      useClass: CloudinaryProvider,
    }
  ],
  exports: [
    KnexModule,
    RedisModule,
    EventEmitterModule,
    ThrottlerModule,
    WinstonModule,
    StorageProvider
  ],
})
export class InfrastructureModule {}
