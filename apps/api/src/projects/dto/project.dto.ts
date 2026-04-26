import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProjectSourceType, ProjectStatus } from '@prisma/client';

export class ProjectTeamMemberDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Role ID assigned inside the project workspace' })
  @IsString()
  roleId: string;
}

export class AssignProjectTeamDto {
  @ApiProperty({ type: [ProjectTeamMemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectTeamMemberDto)
  members: ProjectTeamMemberDto[];
}

export class CreateProjectDto {
  @ApiProperty({ enum: ProjectSourceType, description: 'Project source creation mode' })
  @IsEnum(ProjectSourceType)
  sourceType: ProjectSourceType;

  @ApiPropertyOptional({ description: 'Required only when sourceType is TENDER' })
  @IsOptional()
  @IsString()
  tenderId?: string;

  @ApiPropertyOptional({ example: 'PRJ-2025-001' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: 'مشروع المبنى الإداري' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  nameAr?: string;

  @ApiPropertyOptional({ example: 'Administrative Building Project' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  nameEn?: string;

  @ApiPropertyOptional({ example: 'HQ' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  companyCode?: string;

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

  @ApiPropertyOptional({ example: 'SAR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ example: 15000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  contractValue?: number;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ type: [ProjectTeamMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectTeamMemberDto)
  teamMembers?: ProjectTeamMemberDto[];
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
