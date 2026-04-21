import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { AuthProvider } from '@/modules/auth/enums/auth.enum';

export class LoginDto {
  @ApiProperty({ example: 'memox@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ 
    enum: AuthProvider, 
    default: AuthProvider.Password,
    description: 'AuthProvider' 
  })
  @IsEnum(AuthProvider)
  @IsOptional()
  provider: AuthProvider = AuthProvider.Password;
}
