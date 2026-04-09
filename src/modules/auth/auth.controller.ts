import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Request() req, @Body() createUserDto: CreateUserDto) {
    const deviceInfo = req.headers['x-device-id'] || req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || '0.0.0.0';
    return this.authService.register(createUserDto, deviceInfo, ipAddress);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user and return JWT' })
  login(@Request() req, @Body() loginDto: LoginDto) {
    const deviceInfo = req.headers['x-device-id'] || req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || '0.0.0.0';
    return this.authService.login(loginDto, deviceInfo, ipAddress);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh tokens' })
  refresh(@Request() req, @Body() refreshTokenDto: RefreshTokenDto) {
    const deviceInfo = req.headers['x-device-id'] || req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || '0.0.0.0';
    return this.authService.refreshTokens(refreshTokenDto.refreshToken, deviceInfo, ipAddress);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Request() req) {
    return req.user;
  }
}
