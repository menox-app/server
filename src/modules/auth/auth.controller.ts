import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '@/modules/auth/auth.service';
import { LoginDto } from '@/modules/auth/dtos/login.dto';
import { CreateUserDto } from '@/modules/users/dtos/create-user.dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { RefreshTokenDto } from './dtos/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login to the system' })
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip;
    return this.authService.login(loginDto, deviceInfo, ipAddress);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new account' })
  async register(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip;
    return this.authService.register(createUserDto, deviceInfo, ipAddress);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get new access token from refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Request() req: any) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip;
    return this.authService.refreshTokens(refreshTokenDto.refresh_token, deviceInfo, ipAddress);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from the system' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto.refresh_token);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req: any) {
    const { passwordHash, ...userWithoutPassword } = req.user;
    return userWithoutPassword;
  }
}
