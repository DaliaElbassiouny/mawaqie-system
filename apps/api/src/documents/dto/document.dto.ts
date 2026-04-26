import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const DOCUMENT_ENTITY_TYPES = ['project', 'purchase_request', 'activity', 'invoice', 'extract'] as const;
export const DOCUMENT_CATEGORIES = [
  'general',
  'purchase_request',
  'quotation',
  'approval',
  'drawing',
  'method_statement',
  'invoice',
  'extract',
  'contract',
] as const;

export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export class ListDocumentsQueryDto {
  @ApiPropertyOptional({ enum: DOCUMENT_ENTITY_TYPES })
  @IsOptional()
  @IsEnum(DOCUMENT_ENTITY_TYPES)
  entityType?: DocumentEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_CATEGORIES })
  @IsOptional()
  @IsEnum(DOCUMENT_CATEGORIES)
  category?: DocumentCategory;
}
