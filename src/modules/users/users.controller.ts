import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User } from '@prisma/client';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile info' })
  @ApiResponse({ status: 200, type: UserEntity })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user avatar' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 200, type: UserEntity })
  async updateAvatar(@Request() req, @Body() updateAvatarDto: UpdateAvatarDto) {
    const userId = req.user.id;

    // 1. Handle Multipart Upload
    if (req.isMultipart && req.isMultipart()) {
      const parts = await req.file();
      if (parts) {
        this.extractAvatarMultipartFields(parts.fields, updateAvatarDto);

        const buffer = await parts.toBuffer();
        const uploadResult = await this.cloudinaryService.uploadImage(buffer, 'avatars');
        
        updateAvatarDto.avatarUrl = uploadResult.secure_url;
        updateAvatarDto.avatarPublicId = (uploadResult as any).public_id;
      }
    }

    if (!updateAvatarDto.avatarUrl) {
      throw new BadRequestException('Avatar URL or image file is required');
    }

    return this.usersService.updateAvatar(userId, {
      avatarUrl: updateAvatarDto.avatarUrl,
      avatarPublicId: updateAvatarDto.avatarPublicId,
    });
  }

  private extractAvatarMultipartFields(fields: any, dto: UpdateAvatarDto) {
    if (!fields) return;
    if (fields.avatarUrl) dto.avatarUrl = fields.avatarUrl.value;
    if (fields.avatarPublicId) dto.avatarPublicId = fields.avatarPublicId.value;
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, type: [UserEntity] })
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiResponse({ status: 200, type: UserEntity })
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, type: UserEntity })
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
