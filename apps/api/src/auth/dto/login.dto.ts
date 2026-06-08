import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@mawaqie.local' })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
  email: string;

  @ApiProperty({ example: 'Mawaqie@2026!' })
  @IsString()
  @MinLength(6, { message: 'كلمة المرور قصيرة جداً' })
  password: string;
}
