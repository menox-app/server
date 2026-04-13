import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, ...userData } = createUserDto;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          ...userData,
          passwordHash: hashedPassword,
          avatarUrl: userData.avatarUrl || null,
        } as any,
      });

      // 2. Create Initial Avatar entry if URL is provided
      if (userData.avatarUrl) {
        await (tx as any).userAvatar.create({
          data: {
            userId: user.id,
            url: userData.avatarUrl,
            publicId: (userData as any).avatarPublicId || null,
            isCurrent: true,
          },
        });
      }

      return user;
    });
  }

  async updateProfile(id: string, data: { displayName?: string; bio?: string }): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateAvatar(id: string, data: { avatarUrl: string; avatarPublicId?: string }): Promise<User> {
    const { avatarUrl, avatarPublicId } = data;

    return this.prisma.$transaction(async (tx) => {
      // 1. Update User avatarUrl
      const user = await tx.user.update({
        where: { id },
        data: { avatarUrl },
      });

      // 2. Manage Avatar History
      // Mark old current avatar as false
      await (tx as any).userAvatar.updateMany({
        where: { userId: id, isCurrent: true },
        data: { isCurrent: false },
      });

      // Add new current avatar
      await (tx as any).userAvatar.create({
        data: {
          userId: id,
          url: avatarUrl,
          publicId: avatarPublicId || null,
          isCurrent: true,
        },
      });

      return user;
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username } as any,
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  // Session management is now in AuthService, we remove updateRefreshToken from here
}
