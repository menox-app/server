import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { BaseRepository } from '@/infrastructure/repositories/base.repository';
import { User } from './interfaces/user.model';
import { CreateUserDto } from './dtos/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Collections } from '@/common/enums/collections.enum';

@Injectable()
export class UsersService extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex);
  }

  async findAllUsers(currentUserId?: string) {
    const query = this.knex(Collections.USERS);
    const users = await this.applyUserStats(query, currentUserId);
    return users.map(u => this.formatUserResponse(u));
  }

  async findOneUser(id: string, currentUserId?: string) {
    const query = this.knex(Collections.USERS).where({ id });
    const user = await this.applyUserStats(query, currentUserId).first();
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return this.formatUserResponse(user);
  }

  async findByEmail(email: string) {
    return this.findOneByCondition(Collections.USERS, { email });
  }
  async findByUsername(username: string) {
    return this.findOneByCondition(Collections.USERS, { username });
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { password, avatarPublicId, ...userData } = createUserDto;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    return this.transaction(async (trx) => {
      const [user] = await trx(Collections.USERS)
        .insert({
          id: randomUUID(),
          email: userData.email,
          username: userData.username,
          display_name: userData.displayName || null,
          password_hash: hashedPassword,
          avatar_url: userData.avatarUrl || null,
          updated_at: new Date(),
        })
        .returning('*');

      if (userData.avatarUrl) {
        await trx(Collections.USER_AVATARS).insert({
          id: randomUUID(),
          user_id: user.id,
          url: userData.avatarUrl,
          public_id: avatarPublicId || null,
          is_current: true,
        });
      }

      return user;
    });
  }

  async updateProfile(id: string, data: { displayName?: string; bio?: string }): Promise<User> {
    const updateData: Record<string, any> = { updated_at: new Date() };
    if (data.displayName !== undefined) updateData.display_name = data.displayName;
    if (data.bio !== undefined) updateData.bio = data.bio;

    const user = await this.update(Collections.USERS, id, updateData);
    return user;
  }

  async updateAvatar(id: string, data: { avatarUrl: string; avatarPublicId?: string }): Promise<User> {
    const { avatarUrl, avatarPublicId } = data;

    return this.transaction(async (trx) => {
      const [user] = await trx(Collections.USERS)
        .where({ id })
        .update({ avatar_url: avatarUrl, updated_at: new Date() })
        .returning('*');

      await trx(Collections.USER_AVATARS)
        .where({ user_id: id, is_current: true })
        .update({ is_current: false });

      await trx(Collections.USER_AVATARS).insert({
        id: randomUUID(),
        user_id: id,
        url: avatarUrl,
        public_id: avatarPublicId || null,
        is_current: true,
      });

      return user;
    });
  }

  async remove(id: string): Promise<void> {
    await this.delete(Collections.USERS, id);
  }


  private applyUserStats(query: Knex.QueryBuilder, currentUserId?: string) {
    return query.select([
      'id', 'username', 'email', 'display_name', 'avatar_url', 'bio', 'is_active', 'is_verified', 'role', 'created_at', 'updated_at'
    ]).select({
      follower_count: this.knex(Collections.FOLLOWS)
        .count('*').whereRaw(`${Collections.FOLLOWS}.following_id = ${Collections.USERS}.id`),

      following_count: this.knex(Collections.FOLLOWS)
        .count('*').whereRaw(`${Collections.FOLLOWS}.follower_id = ${Collections.USERS}.id`),

      post_count: this.knex(Collections.POSTS)
        .count('*').whereRaw(`${Collections.POSTS}.author_id = ${Collections.USERS}.id`),

      is_following: this.knex(Collections.FOLLOWS)
        .count('*')
        .where({ follower_id: currentUserId || null })
        .whereRaw(`${Collections.FOLLOWS}.following_id = ${Collections.USERS}.id`)
    });
  }

  private formatUserResponse(user: any) {
    if (!user) return null;
    return {
      ...user,
      follower_count: Number(user.follower_count || 0),
      following_count: Number(user.following_count || 0),
      post_count: Number(user.post_count || 0),
      is_following: Number(user.is_following || 0) > 0
    };
  }

}


