import { ApiProperty } from '@nestjs/swagger';

export class UserEntity {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'memox' })
  username: string;

  @ApiProperty({ example: 'memox@example.com' })
  email: string;

  @ApiProperty({ example: 'Memox User' })
  displayName: string;

  @ApiProperty({ example: 'https://r2.memox.com/avatar.png' })
  avatarUrl: string;

  @ApiProperty({ example: 'Meme is life' })
  bio: string;

  @ApiProperty()
  isPro: boolean;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
