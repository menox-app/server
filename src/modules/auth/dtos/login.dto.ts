import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { LoginMethod } from '@/modules/auth/enums/auth.enum';

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
    enum: LoginMethod, 
    default: LoginMethod.Password,
    description: 'Phương thức đăng nhập' 
  })
  @IsEnum(LoginMethod)
  @IsOptional()
  method: LoginMethod = LoginMethod.Password;
}
