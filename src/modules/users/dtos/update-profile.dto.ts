import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Memox King', required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ example: 'Living life one post at a time.', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  bio?: string;
}
