import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus, ExtractStatus } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumberString,
  Min,
  IsInt,
  Max,
} from 'class-validator';

// ─── Cost Items ──────────────────────────────────────────────────────────────

export class CreateCostItemDto {
  @ApiProperty({ example: 'CI-001' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'أعمال الحفر والردم' })
  @IsString()
  nameAr: string;

  @ApiPropertyOptional({ example: 'Excavation & Backfill' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({ example: 'CIVIL' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 'م³' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: '1500' })
  @IsOptional()
  @IsNumberString()
  quantity?: string;

  @ApiPropertyOptional({ example: '250' })
  @IsOptional()
  @IsNumberString()
  unitCost?: string;

  @ApiPropertyOptional({ example: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCostItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  quantity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  unitCost?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListCostItemsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export const INVOICE_STATUSES = Object.values(InvoiceStatus);

export class CreateInvoiceDto {
  @ApiProperty({ example: 'INV-001' })
  @IsString()
  invoiceNumber: string;

  @ApiProperty({ example: '2025-03-15', description: 'ISO 8601 date: YYYY-MM-DD' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'شركة المقاولات المتحدة' })
  @IsString()
  vendor: string;

  @ApiPropertyOptional({ description: 'Link to a cost item (optional)' })
  @IsOptional()
  @IsString()
  costItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '150000', description: 'Amount before VAT, as a numeric string' })
  @IsNumberString()
  amountBeforeTax: string;

  @ApiPropertyOptional({ example: '22500', description: '15% VAT amount' })
  @IsOptional()
  @IsNumberString()
  taxAmount?: string;

  @ApiPropertyOptional({ example: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date: YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  costItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  amountBeforeTax?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  taxAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

// ─── Extracts ────────────────────────────────────────────────────────────────

export const EXTRACT_STATUSES = Object.values(ExtractStatus);

export class CreateExtractDto {
  @ApiProperty({ example: 'EXT-001' })
  @IsString()
  extractNumber: string;

  @ApiProperty({ example: '2025-03-31', description: 'ISO 8601 date: YYYY-MM-DD' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '850000' })
  @IsNumberString()
  amountBeforeTax: string;

  @ApiPropertyOptional({ example: '127500' })
  @IsOptional()
  @IsNumberString()
  taxAmount?: string;

  @ApiPropertyOptional({ example: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateExtractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extractNumber?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date: YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  amountBeforeTax?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  taxAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: ExtractStatus })
  @IsOptional()
  @IsEnum(ExtractStatus)
  status?: ExtractStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListExtractsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ enum: ExtractStatus })
  @IsOptional()
  @IsEnum(ExtractStatus)
  status?: ExtractStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
