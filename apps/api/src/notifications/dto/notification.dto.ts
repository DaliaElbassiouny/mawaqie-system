import { IsBoolean, IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const NOTIFICATION_TYPES = ['INFO', 'SUCCESS', 'WARNING', 'ACTION_RESULT'] as const;

export class CreateNotificationDto {
  userId: string;
  title: string;
  body?: string;
  type?: (typeof NOTIFICATION_TYPES)[number];
  entityType?: string;
  entityId?: string;
  route?: string;
}

export class ListNotificationsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) unreadOnly?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) limit?: number;
}
