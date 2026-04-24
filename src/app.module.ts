import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configs, validationSchema } from './configs';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { PostsModule } from './modules/posts/posts.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FollowsModule } from './modules/follows/follows.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ApplicationGuards } from './common/guards/application.guard';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      validationSchema,
    }),

    // Shared Infrastructure (Database, Redis, Events, Logging, Throttler)
    InfrastructureModule,

    // Business Features
    UsersModule,
    AuthModule,
    PostsModule,
    CommentsModule,
    FollowsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    ...ApplicationGuards,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, HttpLoggerMiddleware)
      .forRoutes('*');
  }
}
