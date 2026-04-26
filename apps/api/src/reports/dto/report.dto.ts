import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ActivityStatus,
  ExtractStatus,
  InvoiceStatus,
  ProjectStatus,
  RequirementReadinessStatus,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

export const PROCUREMENT_REQUIREMENT_TYPES = ['MATERIALS', 'EQUIPMENT'] as const;
export type ProcurementRequirementType = (typeof PROCUREMENT_REQUIREMENT_TYPES)[number];

class BaseReportFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Client search text' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  client?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ExecutiveSummaryQueryDto extends BaseReportFiltersDto {
  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

export class ProjectStatusReportQueryDto extends BaseReportFiltersDto {
  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  procurementRiskOnly?: boolean;
}

export class OperationsReportQueryDto extends BaseReportFiltersDto {
  @ApiPropertyOptional({ enum: ActivityStatus })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignee?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  blockedOnly?: boolean;

  @ApiPropertyOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  delayedOnly?: boolean;
}

export class ProcurementReadinessReportQueryDto extends BaseReportFiltersDto {
  @ApiPropertyOptional({ enum: PROCUREMENT_REQUIREMENT_TYPES })
  @IsOptional()
  @IsIn(PROCUREMENT_REQUIREMENT_TYPES)
  requirementType?: ProcurementRequirementType;

  @ApiPropertyOptional({ enum: RequirementReadinessStatus })
  @IsOptional()
  @IsEnum(RequirementReadinessStatus)
  requirementStatus?: RequirementReadinessStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignee?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  blockedOnly?: boolean;
}

export class DailyReportsHistoryQueryDto extends BaseReportFiltersDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  blockersOnly?: boolean;
}

export class CostSummaryReportQueryDto extends BaseReportFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class InvoiceReportQueryDto extends BaseReportFiltersDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  costCode?: string;
}

export class ExtractsReportQueryDto extends BaseReportFiltersDto {
  @ApiPropertyOptional({ enum: ExtractStatus })
  @IsOptional()
  @IsEnum(ExtractStatus)
  status?: ExtractStatus;
}
