import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@cdc-system.local' })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
  email: string;

  @ApiProperty({ example: 'Admin@123456' })
  @IsString()
  @MinLength(6, { message: 'كلمة المرور قصيرة جداً' })
  password: string;
}
