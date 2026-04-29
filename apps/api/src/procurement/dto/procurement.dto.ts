import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PRApprovalStage } from '@prisma/client';

export const PR_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
  'RECEIVED',
] as const;

export const PR_REQUIREMENT_TYPES = ['MATERIALS', 'EQUIPMENT', 'SERVICES', 'OTHER'] as const;
export const PR_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

export type PRStatusValue = (typeof PR_STATUSES)[number];
export type PRRequirementType = (typeof PR_REQUIREMENT_TYPES)[number];
export type PRPriority = (typeof PR_PRIORITIES)[number];

export class CreatePurchaseRequestItemDto {
  @ApiProperty() @IsString() titleAr: string;
  @ApiPropertyOptional() @IsOptional() @IsString() titleEn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() unitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() estimatedTotal?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() approvedQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() approvedUnitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() approvedTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreatePurchaseRequestDto {
  @ApiProperty() @IsString() projectId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activityId?: string;
  @ApiProperty() @IsString() nameAr: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameEn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: PR_REQUIREMENT_TYPES }) @IsOptional() @IsEnum(PR_REQUIREMENT_TYPES) requirementType?: string;
  @ApiPropertyOptional({ enum: PR_PRIORITIES }) @IsOptional() @IsEnum(PR_PRIORITIES) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vendor?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDeliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @Type(() => Boolean) @IsBoolean() saveAsDraft?: boolean;
  @ApiPropertyOptional({ type: [CreatePurchaseRequestItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseRequestItemDto)
  items?: CreatePurchaseRequestItemDto[];
}

export class UpdatePurchaseRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameEn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: PR_REQUIREMENT_TYPES }) @IsOptional() @IsEnum(PR_REQUIREMENT_TYPES) requirementType?: string;
  @ApiPropertyOptional({ enum: PR_PRIORITIES }) @IsOptional() @IsEnum(PR_PRIORITIES) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() vendor?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDeliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() actualDeliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() approvalNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activityId?: string;
}

export class ListPurchaseRequestsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activityId?: string;
  @ApiPropertyOptional({ enum: PR_STATUSES }) @IsOptional() @IsEnum(PR_STATUSES) status?: PRStatusValue;
  @ApiPropertyOptional({ enum: PR_PRIORITIES }) @IsOptional() @IsEnum(PR_PRIORITIES) priority?: PRPriority;
  @ApiPropertyOptional({ enum: PR_REQUIREMENT_TYPES }) @IsOptional() @IsEnum(PR_REQUIREMENT_TYPES) requirementType?: PRRequirementType;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) limit?: number;
}

export class SubmitPRDto {
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class ApproveRejectPRDto {
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class RejectPRDto {
  @ApiProperty() @IsString() @IsNotEmpty() note: string;
}

export { PRApprovalStage };
