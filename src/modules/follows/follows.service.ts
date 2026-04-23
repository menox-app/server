import { Collections } from '@/common/enums/collections.enum';
import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { BaseRepository } from '@/infrastructure/repositories/base.repository';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class FollowsService extends BaseRepository {
    constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
        super(knex);
    }

    async follow(followerId: string, followingId: string) {
        if (followerId === followingId) {
            throw new BadRequestException('You cannot follow yourself');
        }

        const targetUser = await this.findOneByCondition(Collections.USERS, { id: followingId });
        if (!targetUser) {
            throw new NotFoundException('User not found');
        }

        const existingFollow = await this.findOneByCondition(Collections.FOLLOWS, { follower_id: followerId, following_id: followingId });
        if (existingFollow) {
            await this.knex(Collections.FOLLOWS)
                .where({ follower_id: followerId, following_id: followingId })
                .delete();

            return { message: 'Unfollowed successfully', is_following: false };
        }

        await this.create(Collections.FOLLOWS, {
            follower_id: followerId,
            following_id: followingId,
        });
        return { message: 'Followed successfully', is_following: true };
    }
}
