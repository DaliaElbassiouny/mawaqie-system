import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ActivityStatus,
  ApprovalStatus,
  LookaheadPriority as PrismaLookaheadPriority,
  LookaheadStatus as PrismaLookaheadStatus,
  RequirementReadinessStatus,
} from '@prisma/client';
import { MAX_LIMIT } from '@cdc/shared';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

// Schedule

export class CreateScheduleDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiProperty({ example: 4, description: '1-12' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}

// Activity

export const ACTIVITY_CATEGORIES = [
  'CIVIL',
  'MECHANICAL',
  'ELECTRICAL',
  'FINISHING',
  'PROCUREMENT',
  'ADMIN',
  'HSE',
  'OTHER',
] as const;

export const LOOKAHEAD_STATUSES = Object.values(PrismaLookaheadStatus);

export const LOOKAHEAD_PRIORITIES = Object.values(PrismaLookaheadPriority);
export const REQUIREMENT_READINESS_STATUSES = Object.values(RequirementReadinessStatus);
export const PROCUREMENT_REQUIREMENT_TYPES = ['MATERIALS', 'EQUIPMENT'] as const;

export type LookaheadStatus = PrismaLookaheadStatus;
export type LookaheadPriority = PrismaLookaheadPriority;
export type ProcurementRequirementType = (typeof PROCUREMENT_REQUIREMENT_TYPES)[number];

export class CreateActivityDto {
  @ApiPropertyOptional({ description: 'Link to a monthly schedule. Omit for standalone activity.' })
  @IsOptional()
  @IsString()
  scheduleId?: string;

  @ApiPropertyOptional({ description: 'Leave blank - auto-generated as ACT-001, ACT-002...' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  nameAr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  nameEn?: string;

  @ApiPropertyOptional({ enum: ACTIVITY_CATEGORIES, default: 'OTHER' })
  @IsOptional()
  @IsIn(ACTIVITY_CATEGORIES)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ enum: ActivityStatus, default: 'NOT_STARTED' })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @ApiPropertyOptional({ enum: LOOKAHEAD_STATUSES, default: 'PLANNED' })
  @IsOptional()
  @IsIn(LOOKAHEAD_STATUSES)
  lookaheadStatus?: LookaheadStatus;

  @ApiPropertyOptional({ enum: LOOKAHEAD_PRIORITIES, default: 'MEDIUM' })
  @IsOptional()
  @IsIn(LOOKAHEAD_PRIORITIES)
  priority?: LookaheadPriority;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  readyForExecution?: boolean;

  @ApiPropertyOptional({ description: 'Describe what is still missing when the activity is not ready.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  missingRequirements?: string;

  @ApiPropertyOptional({ example: '2026-04-01', description: 'ISO 8601 date: YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  plannedStart?: string;

  @ApiPropertyOptional({ example: '2026-04-30', description: 'ISO 8601 date: YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  plannedEnd?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date: YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  actualStart?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date: YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  actualEnd?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibleUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Required when status = BLOCKED' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  blockerReason?: string;

  @ApiPropertyOptional({ example: '2 rebar workers + 1 carpenter' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  requiredLabor?: string;

  @ApiPropertyOptional({ enum: REQUIREMENT_READINESS_STATUSES })
  @IsOptional()
  @IsEnum(RequirementReadinessStatus)
  laborRequirementStatus?: RequirementReadinessStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  laborRequirementNotes?: string;

  @ApiPropertyOptional({ example: 'rebar D16 + concrete C25 + formwork' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  requiredMaterials?: string;

  @ApiPropertyOptional({ enum: REQUIREMENT_READINESS_STATUSES })
  @IsOptional()
  @IsEnum(RequirementReadinessStatus)
  materialsRequirementStatus?: RequirementReadinessStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  materialsRequirementNotes?: string;

  @ApiPropertyOptional({ example: 'crane + concrete vibrator' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  requiredEquipment?: string;

  @ApiPropertyOptional({ enum: REQUIREMENT_READINESS_STATUSES })
  @IsOptional()
  @IsEnum(RequirementReadinessStatus)
  equipmentRequirementStatus?: RequirementReadinessStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  equipmentRequirementNotes?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  expectedCost?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  actualCost?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;
}

export class UpdateActivityDto extends PartialType(CreateActivityDto) {}

// Approval

export class ApproveActivityDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

// Daily Report

class BaseDailyLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  completedWork?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  workedActivitiesSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  blockers?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  tomorrowPlan?: string;

  @ApiPropertyOptional({ type: [String], description: 'Optional related activities from the same project.' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  relatedActivityIds?: string[];
}

export class CreateDailyLogDto extends BaseDailyLogDto {
  @ApiProperty({ example: '2026-04-23' })
  @IsDateString()
  date!: string;
}

export class UpdateDailyLogDto extends PartialType(BaseDailyLogDto) {}

// Query filters

class BaseActivityFiltersDto {
  @ApiPropertyOptional({ enum: ActivityStatus })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @ApiPropertyOptional({ enum: LOOKAHEAD_STATUSES })
  @IsOptional()
  @IsIn(LOOKAHEAD_STATUSES)
  lookaheadStatus?: LookaheadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibleUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduleId?: string;

  @ApiPropertyOptional({ enum: ApprovalStatus })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  approvalStatus?: ApprovalStatus;

  @ApiPropertyOptional({ enum: LOOKAHEAD_PRIORITIES })
  @IsOptional()
  @IsIn(LOOKAHEAD_PRIORITIES)
  priority?: LookaheadPriority;

  @ApiPropertyOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  readyForExecution?: boolean;

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

export class ListActivitiesQueryDto extends BaseActivityFiltersDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_LIMIT, default: 25 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;
}

export class GetWeeklyLookaheadQueryDto extends BaseActivityFiltersDto {
  @ApiPropertyOptional({ description: 'YYYY-MM-DD. Defaults to today.' })
  @IsOptional()
  @IsDateString()
  windowStart?: string;

  @ApiPropertyOptional({ default: 7, minimum: 1, maximum: 14 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  days = 7;
}

export class ListDailyLogsQueryDto {
  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_LIMIT, default: 25 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;
}

export class ListProcurementReadinessQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: PROCUREMENT_REQUIREMENT_TYPES })
  @IsOptional()
  @IsIn(PROCUREMENT_REQUIREMENT_TYPES)
  requirementType?: ProcurementRequirementType;

  @ApiPropertyOptional({ enum: REQUIREMENT_READINESS_STATUSES })
  @IsOptional()
  @IsEnum(RequirementReadinessStatus)
  requirementStatus?: RequirementReadinessStatus;

  @ApiPropertyOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  blockedOnly?: boolean;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_LIMIT, default: 25 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;
}

export class UpdateProcurementRequirementDto {
  @ApiProperty({ enum: REQUIREMENT_READINESS_STATUSES })
  @IsEnum(RequirementReadinessStatus)
  status!: RequirementReadinessStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export type ActivityFilters = BaseActivityFiltersDto;
