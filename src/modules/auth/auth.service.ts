import { Injectable, UnauthorizedException, ConflictException, Inject, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../../infrastructure/knex/knex.module';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dtos/create-user.dto';
import { LoginDto } from './dtos/login.dto';
import { LoginMethod } from './enums/auth.enum';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
  ) {}

  /**
   * Main login point supporting multiple methods
   */
  async login(loginDto: LoginDto, deviceInfo?: string, ipAddress?: string) {
    const { email, password, method } = loginDto;

    switch (method) {
      case LoginMethod.Password:
        if (!password) {
          throw new BadRequestException('Password is required for this login method');
        }
        return this.loginWithPassword(email, password, deviceInfo, ipAddress);
      
      case LoginMethod.Code:
        throw new BadRequestException('Login with verification code is not implemented yet');
      
      case LoginMethod.Google:
      case LoginMethod.Apple:
      case LoginMethod.Social:
        throw new BadRequestException('Social login is not implemented yet');

      default:
        throw new BadRequestException('Unsupported login method');
    }
  }

  private async loginWithPassword(email: string, pass: string, deviceInfo?: string, ipAddress?: string) {
    const user = (await this.usersService.findByEmail(email)) as any;
    
    if (!user || !user.passwordHash || !(await bcrypt.compare(pass, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateTokens(user.id, user.email, deviceInfo, ipAddress);
  }

  async generateTokens(userId: string, email: string, deviceInfo?: string, ipAddress?: string) {
    const payload = { id: userId, sub: userId, email };
    
    const accessSecret = this.configService.getOrThrow<string>('app.jwtSecret');
    const refreshSecret = this.configService.getOrThrow<string>('app.jwtRefreshSecret');
    
    // Hardcoded expiration times as requested
    const accessExpiresIn = '1h';
    const refreshExpiresIn = '7d';

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: accessSecret, expiresIn: accessExpiresIn }),
      this.jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: refreshExpiresIn }),
    ]);

    const hashedToken = await bcrypt.hash(refresh_token, 10);
    const expiresAt = new Date();
    // For sessions table, we count 7 days
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save/Update session for multi-device tracking
    await this.upsertSession(userId, hashedToken, deviceInfo, ipAddress, expiresAt);

    return { access_token, refresh_token };
  }

  private async upsertSession(userId: string, token: string, deviceInfo?: string, ipAddress?: string, expiresAt?: Date) {
    const info = deviceInfo || 'unknown';
    const ip = ipAddress || '0.0.0.0';
    
    const existingSession = await this.knex('sessions')
      .where({ userId: userId, deviceInfo: info })
      .first();

    if (existingSession) {
      await this.knex('sessions')
        .where({ id: existingSession.id })
        .update({ token, ipAddress: ip, expiresAt: expiresAt || new Date() });
    } else {
      await this.knex('sessions').insert({
        id: randomUUID(),
        userId: userId,
        token,
        deviceInfo: info,
        ipAddress: ip,
        expiresAt: expiresAt || new Date(),
      });
    }
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

    const user = (await this.usersService.createUser(createUserDto)) as any;
    return this.generateTokens(user.id, user.email, deviceInfo, ipAddress);
  }

  async refreshTokens(refreshToken: string, deviceInfo?: string, ipAddress?: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('app.jwtRefreshSecret'),
      });

      const sessions = await this.knex('sessions').where({ userId: payload.id });

      let validSession: any = null;
      for (const session of sessions) {
        if (await bcrypt.compare(refreshToken, session.token)) {
          validSession = session;
          break;
        }
      }

      if (!validSession || new Date(validSession.expiresAt) < new Date()) {
        if (validSession) {
          await this.knex('sessions').where({ id: validSession.id }).delete();
        }
        throw new UnauthorizedException('Access Denied');
      }

      await this.knex('sessions').where({ id: validSession.id }).delete();
      const user = (await this.usersService.findOneUser(payload.id)) as any;

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

      const sessions = await this.knex('sessions').where({ userId: payload.id });

      for (const session of sessions) {
        if (await bcrypt.compare(refreshToken, session.token)) {
          await this.knex('sessions').where({ id: session.id }).delete();
          break;
        }
      }
    } catch (e) {
      // Ignore errors on logout
    }
  }
}
