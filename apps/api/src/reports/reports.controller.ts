import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, AuthUser } from '@mawaqie/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ReportsService } from './reports.service';
import {
  CostSummaryReportQueryDto,
  DailyReportsHistoryQueryDto,
  ExecutiveSummaryQueryDto,
  ExtractsReportQueryDto,
  InvoiceReportQueryDto,
  OperationsReportQueryDto,
  PROCUREMENT_REQUIREMENT_TYPES,
  ProcurementReadinessReportQueryDto,
  ProjectStatusReportQueryDto,
} from './dto/report.dto';
import {
  ActivityStatus,
  ExtractStatus,
  InvoiceStatus,
  ProjectStatus,
  RequirementReadinessStatus,
} from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.REPORTS_VIEW)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('executive-summary')
  @ApiOperation({ summary: 'Executive reporting dashboard summary' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'client', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  getExecutiveSummary(
    @Query() query: ExecutiveSummaryQueryDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.reportsService.getExecutiveSummary(query, caller);
  }

  @Get('project-status')
  @ApiOperation({ summary: 'Management project status report' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'client', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  @ApiQuery({ name: 'procurementRiskOnly', required: false, type: Boolean })
  getProjectStatusReport(
    @Query() query: ProjectStatusReportQueryDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.reportsService.getProjectStatusReport(query, caller);
  }

  @Get('operations')
  @ApiOperation({ summary: 'Operations and activity execution report' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'client', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ActivityStatus })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'assignee', required: false })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'blockedOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'delayedOnly', required: false, type: Boolean })
  getOperationsReport(
    @Query() query: OperationsReportQueryDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.reportsService.getOperationsReport(query, caller);
  }

  @Get('procurement-readiness')
  @ApiOperation({ summary: 'Procurement readiness and blockers report' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'client', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'assignee', required: false })
  @ApiQuery({ name: 'requirementType', required: false, enum: PROCUREMENT_REQUIREMENT_TYPES })
  @ApiQuery({ name: 'requirementStatus', required: false, enum: RequirementReadinessStatus })
  @ApiQuery({ name: 'blockedOnly', required: false, type: Boolean })
  getProcurementReadinessReport(
    @Query() query: ProcurementReadinessReportQueryDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.reportsService.getProcurementReadinessReport(query, caller);
  }

  @Get('daily-history')
  @ApiOperation({ summary: 'Daily reports history by date range' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'client', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'blockersOnly', required: false, type: Boolean })
  getDailyReportsHistory(
    @Query() query: DailyReportsHistoryQueryDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.reportsService.getDailyReportsHistory(query, caller);
  }

  @Get('cost-summary')
  @ApiOperation({ summary: 'Project cost summary report' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'client', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  getCostSummaryReport(
    @Query() query: CostSummaryReportQueryDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.reportsService.getCostSummaryReport(query, caller);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Invoice register reporting view' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'client', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'vendor', required: false })
  @ApiQuery({ name: 'costCode', required: false })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  getInvoiceReport(
    @Query() query: InvoiceReportQueryDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.reportsService.getInvoiceReport(query, caller);
  }

  @Get('extracts')
  @ApiOperation({ summary: 'Extracts reporting view' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'client', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'status', required: false, enum: ExtractStatus })
  getExtractsReport(
    @Query() query: ExtractsReportQueryDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.reportsService.getExtractsReport(query, caller);
  }
}
