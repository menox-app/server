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
          displayName: userData.displayName || null,
          passwordHash: hashedPassword,
          avatarUrl: userData.avatarUrl || null,
          updatedAt: new Date(), // Bổ sung để thỏa mãn ràng buộc NOT NULL của DB
        })
        .returning('*');

      if (userData.avatarUrl) {
        await trx('user_avatars').insert({
          id: randomUUID(),
          userId: user.id,
          url: userData.avatarUrl,
          publicId: avatarPublicId || null,
          isCurrent: true,
          // Bảng user_avatars cũng có createdAt NOT NULL mặc định là CURRENT_TIMESTAMP
        });
      }

      return this.mapRow(user);
    });
  }

  async updateProfile(id: string, data: { displayName?: string; bio?: string }): Promise<User> {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.bio !== undefined) updateData.bio = data.bio;

    const user = await this.update('users', id, updateData);
    return this.mapRow(user);
  }

  async updateAvatar(id: string, data: { avatarUrl: string; avatarPublicId?: string }): Promise<User> {
    const { avatarUrl, avatarPublicId } = data;

    return this.transaction(async (trx) => {
      const [user] = await trx('users')
        .where({ id })
        .update({ avatarUrl, updatedAt: new Date() })
        .returning('*');

      await trx('user_avatars')
        .where({ userId: id, isCurrent: true })
        .update({ isCurrent: false });

      await trx('user_avatars').insert({
        id: randomUUID(),
        userId: id,
        url: avatarUrl,
        publicId: avatarPublicId || null,
        isCurrent: true,
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
      passwordHash: row.passwordHash,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      bio: row.bio,
      isPro: row.isPro,
      avatarFrameId: row.avatarFrameId,
      role: row.role,
      isVerified: row.isVerified,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
