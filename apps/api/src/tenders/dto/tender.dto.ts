import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TenderStatus } from '@prisma/client';

export class CreateTenderDto {
  @ApiProperty({ example: 'مشروع المبنى الإداري' })
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  nameAr: string;

  @ApiPropertyOptional({ example: 'Administrative Building Project' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  nameEn?: string;

  @ApiProperty({ example: 'TND-2025-001' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Client ID' })
  @IsString()
  clientId: string;

  @ApiPropertyOptional({ enum: TenderStatus })
  @IsOptional()
  @IsEnum(TenderStatus)
  status?: TenderStatus;

  @ApiPropertyOptional({ example: 'الرياض' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'إنشاءات مدنية' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  projectType?: string;

  @ApiPropertyOptional({ example: 'منافسة حكومية' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  leadSource?: string;

  @ApiPropertyOptional({ example: 'SAR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedValue?: number;

  @ApiPropertyOptional({ example: 4800000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  submittedValue?: number;

  @ApiPropertyOptional({ example: '2025-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  bidReceiptDate?: string;

  @ApiPropertyOptional({ example: '2025-05-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  awardedAt?: string;

  @ApiPropertyOptional({ example: 'الأقل سعراً' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bidResult?: string;

  @ApiPropertyOptional({ example: 'م. أحمد عوض' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  assignedEngineer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateTenderDto extends PartialType(CreateTenderDto) {}
