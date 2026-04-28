import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh-token-string', name: 'refresh_token' })
  @IsString()
  refresh_token: string;
}
