import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY, IS_PUBLIC_OPTIONAL_KEY } from '@/common/decorators/public.decorator';
import { UsersService } from '@/modules/users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Kiểm tra xem route có được đánh dấu là @Public không
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    const isPublicOptional = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_OPTIONAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!token) {
      if (isPublicOptional) return true;
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      // 2. Xác thực JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('app.jwtSecret'),
      });
      
      // 3. Lấy thông tin user từ database (có thể dùng cache sau này)
      const user = await this.usersService.findOneUser(payload.id || payload.sub);

      if (!user || !user.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // 4. Gắn user vào request để dùng ở các bước sau
      request['user'] = user;
    } catch (error) {
      if (isPublicOptional) return true;
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
