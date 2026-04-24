import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { CommentsModule } from '../comments/comments.module';
import { FollowsModule } from '../follows/follows.module';

@Module({
  imports: [
    UsersModule,
    CommentsModule,
    FollowsModule,
    JwtModule,
  ],
  controllers: [PostsController],
  providers: [PostsService]
})
export class PostsModule { }
