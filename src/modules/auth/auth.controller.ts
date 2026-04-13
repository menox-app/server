import { Controller, Post, Body, Get, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiConsumes('multipart/form-data', 'application/json')
  async register(@Request() req, @Body() createUserDto: CreateUserDto) {
    // 1. Handle Multipart Upload (if selected custom file)
    if (req.isMultipart && req.isMultipart()) {
      const parts = await req.file();
      if (parts) {
        // Overlay fields from multipart since @Body() might be empty/partial in multipart requests
        this.extractMultipartFields(parts.fields, createUserDto);

        const buffer = await parts.toBuffer();
        const uploadResult = await this.cloudinaryService.uploadImage(buffer, 'avatars');
        
        createUserDto.avatarUrl = uploadResult.secure_url;
        createUserDto.avatarPublicId = (uploadResult as any).public_id;
      }
    }

    // 2. Execute registration
    const deviceInfo = req.headers['x-device-id'] || req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || '0.0.0.0';
    
    return this.authService.register(createUserDto, deviceInfo, ipAddress);
  }

  private extractMultipartFields(fields: any, dto: CreateUserDto) {
    if (!fields) return;
    if (fields.username) dto.username = fields.username.value;
    if (fields.email) dto.email = fields.email.value;
    if (fields.password) dto.password = fields.password.value;
    if (fields.displayName) dto.displayName = fields.displayName.value;
    if (fields.avatarUrl) dto.avatarUrl = fields.avatarUrl.value;
    if (fields.avatarPublicId) dto.avatarPublicId = fields.avatarPublicId.value;
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
