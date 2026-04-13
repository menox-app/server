import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = (await this.usersService.findByEmail(email)) as any;
    if (user && user.passwordHash && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async generateTokens(userId: string, email: string, deviceInfo?: string, ipAddress?: string) {
    const accessSecret = this.configService.getOrThrow<string>('app.jwtSecret');
    const refreshSecret = this.configService.getOrThrow<string>('app.jwtRefreshSecret');
    const accessExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: accessSecret,
          expiresIn: accessExpiresIn,
        } as any,
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: refreshSecret,
          expiresIn: refreshExpiresIn,
        } as any,
      ),
    ]);

    // Create session
    const hashedToken = await bcrypt.hash(refresh_token, 10);
    const expiresAt = new Date();
    // Parse duration (e.g., '7d') - simple implementation
    const days = parseInt(refreshExpiresIn) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    // Session management logic: Upsert based on userId and deviceInfo
    // This prevents duplicate sessions if the user logs in multiple times from the same browser
    const existingSession = await (this.prisma as any).session.findFirst({
      where: {
        userId,
        deviceInfo,
      },
    });

    if (existingSession) {
      await (this.prisma as any).session.update({
        where: { id: existingSession.id },
        data: {
          token: hashedToken,
          ipAddress,
          expiresAt,
        },
      });
    } else {
      await (this.prisma as any).session.create({
        data: {
          userId,
          token: hashedToken,
          deviceInfo,
          ipAddress,
          expiresAt,
        },
      });
    }

    return {
      access_token,
      refresh_token,
    };
  }

  async login(loginDto: LoginDto, deviceInfo?: string, ipAddress?: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateTokens(user.id, user.email, deviceInfo, ipAddress);
  }

  async register(createUserDto: CreateUserDto, deviceInfo?: string, ipAddress?: string) {
    const existingUser = await this.usersService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const existingUsername = await this.usersService.findByUsername(createUserDto.username);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const user = (await this.usersService.create(createUserDto)) as any;
    return this.generateTokens(user.id, user.email, deviceInfo, ipAddress);
  }

  async refreshTokens(refreshToken: string, deviceInfo?: string, ipAddress?: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('app.jwtRefreshSecret'),
      });
      
      const sessions = await (this.prisma as any).session.findMany({
        where: { userId: payload.sub },
      });

      let validSession: any = null;
      for (const session of sessions) {
        if (await bcrypt.compare(refreshToken, session.token)) {
          validSession = session;
          break;
        }
      }

      if (!validSession || validSession.expiresAt < new Date()) {
        if (validSession) {
          await (this.prisma as any).session.delete({ where: { id: validSession.id } });
        }
        throw new UnauthorizedException('Access Denied');
      }

      // Rotate session: Delete old one, create new one
      await (this.prisma as any).session.delete({ where: { id: validSession.id } });
      const user = (await this.usersService.findOne(payload.sub)) as any;
      
      return this.generateTokens(user.id, user.email, deviceInfo, ipAddress);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('app.jwtRefreshSecret'),
      });

      const sessions = await (this.prisma as any).session.findMany({
        where: { userId: payload.sub },
      });

      for (const session of sessions) {
        if (await bcrypt.compare(refreshToken, session.token)) {
          await (this.prisma as any).session.delete({ where: { id: session.id } });
          break;
        }
      }
    } catch (e) {
      // Token might be expired, just do nothing or log
    }
  }
}
