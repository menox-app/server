import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { BaseRepository } from '@/infrastructure/repositories/base.repository';
import { User } from './interfaces/user.model';
import { CreateUserDto } from './dtos/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex);
  }

  async findAllUsers(): Promise<User[]> {
    const rows = await this.knex('users').select('*');
    return rows.map((row) => this.mapRow(row));
  }

  async findOneUser(id: string): Promise<User> {
    const user = await this.findById('users', id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.mapRow(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.findOneByCondition('users', { email });
    return row ? this.mapRow(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const row = await this.findOneByCondition('users', { username });
    return row ? this.mapRow(row) : null;
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { password, avatarPublicId, ...userData } = createUserDto;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    return this.transaction(async (trx) => {
      const [user] = await trx('users')
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
        await trx('user_avatars').insert({
          id: randomUUID(),
          user_id: user.id,
          url: userData.avatarUrl,
          public_id: avatarPublicId || null,
          is_current: true,
        });
      }

      return this.mapRow(user);
    });
  }

  async updateProfile(id: string, data: { displayName?: string; bio?: string }): Promise<User> {
    const updateData: Record<string, any> = { updated_at: new Date() };
    if (data.displayName !== undefined) updateData.display_name = data.displayName;
    if (data.bio !== undefined) updateData.bio = data.bio;

    const user = await this.update('users', id, updateData);
    return this.mapRow(user);
  }

  async updateAvatar(id: string, data: { avatarUrl: string; avatarPublicId?: string }): Promise<User> {
    const { avatarUrl, avatarPublicId } = data;

    return this.transaction(async (trx) => {
      const [user] = await trx('users')
        .where({ id })
        .update({ avatar_url: avatarUrl, updated_at: new Date() })
        .returning('*');

      await trx('user_avatars')
        .where({ user_id: id, is_current: true })
        .update({ is_current: false });

      await trx('user_avatars').insert({
        id: randomUUID(),
        user_id: id,
        url: avatarUrl,
        public_id: avatarPublicId || null,
        is_current: true,
      });

      return this.mapRow(user);
    });
  }

  async remove(id: string): Promise<void> {
    await this.delete('users', id);
  }

  private mapRow(row: any): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    isPro: row.is_pro,
    avatarFrameId: row.avatar_frame_id,
    role: row.role,
    isVerified: row.is_verified,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

}
