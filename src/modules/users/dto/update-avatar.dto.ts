import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAvatarDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/...', required: false, description: 'URL of the selected default avatar' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ example: 'avatars/abc123', required: false, description: 'Optional Cloudinary publicId if selecting default avatar' })
  @IsString()
  @IsOptional()
  avatarPublicId?: string;
}
