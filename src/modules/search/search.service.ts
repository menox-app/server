import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { BaseRepository } from '@/infrastructure/repositories/base.repository';
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { FollowsService } from '../follows/follows.service';
import { SearchDto, SearchType } from './dtos/search.dto';
import { Collections } from '@/common/enums/collections.enum';

@Injectable()
export class SearchService extends BaseRepository {
    constructor(
        @Inject(KNEX_CONNECTION) knex: Knex,
        private readonly followsService: FollowsService,
    ) {
        super(knex);
    }

    async search(dto: SearchDto, currentUserId?: string) {
        const { q = '', type = 'all', page = 1, limit = 10 } = dto;
        const offset = (page - 1) * limit;

        const results: any = {
            users: [],
            posts: []
        };

        if (type === SearchType.USER || type === SearchType.ALL) {
            results.users = await this.searchUsers(q, currentUserId || '', offset, limit);
        }

        if (type === SearchType.POST || type === SearchType.ALL) {
            results.posts = await this.searchPosts(q, limit, offset);
        }

        return results;
    }

    private async searchUsers(query: string, currentUserId: string, offset: number, limit: number) {
        const users = await this.knex(Collections.USERS)
            .where('username', 'ILIKE', `%${query}%`)
            .orWhere('display_name', 'ILIKE', `%${query}%`)
            .select('id', 'username', 'display_name', 'avatar_url')
            .limit(limit)
            .offset(offset);

        if (!currentUserId || !users.length || users.length === 0) {
            return users;
        }

        const authorIds = users.map(user => user.id);
        const followMap = await this.followsService.batchIsFollowing(currentUserId, authorIds);

        return users.map(user => ({
            ...user,
            is_following: !!followMap[user.id]
        }));
    }

    private async searchPosts(query: string, limit: number, offset: number) {
        return await this.knex(Collections.POSTS)
            .join(Collections.USERS, 'posts.author_id', 'users.id')
            .where('content', 'ILIKE', `%${query}%`)
            .andWhere('visibility', 'public')
            .select(
                'posts.*',
                'users.avatar_url',
                'users.username',
                'users.display_name',
            )
            .orderBy('posts.created_at', 'desc')
            .limit(limit)
            .offset(offset)
    }
}
