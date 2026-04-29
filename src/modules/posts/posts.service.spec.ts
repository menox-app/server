import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { AdaptiveCacheService } from '@/infrastructure/redis/adaptive-cache.service';
import { RedisService } from '@/infrastructure/redis/redis.service';
import { FollowsService } from '../follows/follows.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('PostsService', () => {
  let service: PostsService;
  const followService = {
    batchIsFollowing: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: KNEX_CONNECTION, useValue: {} },
        { provide: AdaptiveCacheService, useValue: {} },
        { provide: RedisService, useValue: {} },
        { provide: FollowsService, useValue: followService },
        { provide: EventEmitter2, useValue: {} },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('normalizes anonymous post feed counts and empty highlight comments', async () => {
    const result = await (service as any).mapFollowStatus([
      {
        id: 'post-1',
        author_id: 'author-1',
        like_count: '3',
        comment_count: '0',
        is_liked: '0',
        highlight_comments: null,
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'post-1',
        like_count: 3,
        comment_count: 0,
        is_liked: false,
        is_following_author: false,
        highlight_comments: [],
      }),
    ]);
    expect(followService.batchIsFollowing).not.toHaveBeenCalled();
  });

  it('normalizes authenticated post feed liked and following state', async () => {
    followService.batchIsFollowing.mockResolvedValue({ 'author-1': true });

    const result = await (service as any).mapFollowStatus(
      [
        {
          id: 'post-1',
          author_id: 'author-1',
          like_count: '5',
          comment_count: '2',
          is_liked: '1',
          highlight_comments: JSON.stringify([{ id: 'comment-1', reply_count: 2 }]),
        },
      ],
      'user-1',
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: 'post-1',
        like_count: 5,
        comment_count: 2,
        is_liked: true,
        is_following_author: true,
        highlight_comments: [{ id: 'comment-1', reply_count: 2 }],
      }),
    ]);
    expect(followService.batchIsFollowing).toHaveBeenCalledWith('user-1', ['author-1']);
  });
});
