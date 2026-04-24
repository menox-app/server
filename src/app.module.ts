import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configs, validationSchema } from './configs';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { KnexModule } from './infrastructure/knex/knex.module';
import { PostsModule } from './modules/posts/posts.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FollowsModule } from './modules/follows/follows.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CcuInterceptor } from './common/interceptors/ccu.interceptor';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      validationSchema,
    }),

    // Infrastructure
    KnexModule,
    RedisModule,
    EventEmitterModule.forRoot(),

    // Logging (Winston)
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Sử dụng app.env (đã được map từ NODE_ENV trong config)
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

    // Features
    UsersModule,
    AuthModule,
    PostsModule,
    CommentsModule,
    FollowsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_INTERCEPTOR,
    useClass: CcuInterceptor,
  }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, HttpLoggerMiddleware)
      .forRoutes('*');
  }
}
