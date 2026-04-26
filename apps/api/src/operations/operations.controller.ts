import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ActivityStatus, ApprovalStatus } from '@prisma/client';
import { AuthUser, PERMISSIONS } from '@cdc/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  ApproveActivityDto,
  CreateActivityDto,
  CreateDailyLogDto,
  CreateScheduleDto,
  GetWeeklyLookaheadQueryDto,
  ListActivitiesQueryDto,
  ListDailyLogsQueryDto,
  LOOKAHEAD_PRIORITIES,
  LOOKAHEAD_STATUSES,
  UpdateActivityDto,
  UpdateDailyLogDto,
  UpdateScheduleDto,
} from './dto/operation.dto';
import { OperationsService } from './operations.service';

@ApiTags('Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects/:projectId/operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('stats')
  @RequirePermissions(PERMISSIONS.OPERATIONS_VIEW)
  @ApiOperation({ summary: 'Project operations stats' })
  getStats(
    @Param('projectId') projectId: string,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.operationsService.getStats(projectId, caller);
  }

  @Get('lookahead')
  @RequirePermissions(PERMISSIONS.OPERATIONS_VIEW)
  @ApiOperation({ summary: 'Weekly lookahead planning for the project' })
  @ApiQuery({ name: 'windowStart', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'days', required: false, example: 7 })
  @ApiQuery({ name: 'lookaheadStatus', required: false, enum: LOOKAHEAD_STATUSES })
  @ApiQuery({ name: 'priority', required: false, enum: LOOKAHEAD_PRIORITIES })
  @ApiQuery({ name: 'responsibleUserId', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'location', required: false })
  @ApiQuery({ name: 'readyForExecution', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  getWeeklyLookahead(
    @Param('projectId') projectId: string,
    @CurrentUser() caller: AuthUser,
    @Query() query: GetWeeklyLookaheadQueryDto,
  ) {
    return this.operationsService.getWeeklyLookahead(projectId, query, caller);
  }

  @Get('cost-summary')
  @RequirePermissions(PERMISSIONS.COST_VIEW)
  @ApiOperation({ summary: 'Project operational cost summary and cash flow foundation' })
  getCostSummary(
    @Param('projectId') projectId: string,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.operationsService.getCostSummary(projectId, caller);
  }

  @Get('activities')
  @RequirePermissions(PERMISSIONS.OPERATIONS_VIEW)
  @ApiOperation({ summary: 'List project activities' })
  @ApiQuery({ name: 'status', required: false, enum: ActivityStatus })
  @ApiQuery({ name: 'lookaheadStatus', required: false, enum: LOOKAHEAD_STATUSES })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'location', required: false })
  @ApiQuery({ name: 'responsibleUserId', required: false })
  @ApiQuery({ name: 'scheduleId', required: false })
  @ApiQuery({ name: 'approvalStatus', required: false, enum: ApprovalStatus })
  @ApiQuery({ name: 'priority', required: false, enum: LOOKAHEAD_PRIORITIES })
  @ApiQuery({ name: 'readyForExecution', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 25 })
  findActivities(
    @Param('projectId') projectId: string,
    @CurrentUser() caller: AuthUser,
    @Query() query: ListActivitiesQueryDto,
  ) {
    return this.operationsService.findActivities(projectId, query, caller);
  }

  @Post('activities')
  @RequirePermissions(PERMISSIONS.OPERATIONS_CREATE)
  @ApiOperation({ summary: 'Create project activity' })
  createActivity(
    @Param('projectId') projectId: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.operationsService.createActivity(projectId, dto, actor);
  }

  @Patch('activities/:activityId')
  @RequirePermissions(PERMISSIONS.OPERATIONS_UPDATE)
  @ApiOperation({ summary: 'Update project activity' })
  updateActivity(
    @Param('projectId') projectId: string,
    @Param('activityId') activityId: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.operationsService.updateActivity(projectId, activityId, dto, actor);
  }

  @Delete('activities/:activityId')
  @RequirePermissions(PERMISSIONS.OPERATIONS_DELETE)
  @ApiOperation({ summary: 'Delete project activity' })
  deleteActivity(
    @Param('projectId') projectId: string,
    @Param('activityId') activityId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.operationsService.deleteActivity(projectId, activityId, actor);
  }

  @Post('activities/:activityId/submit')
  @RequirePermissions(PERMISSIONS.OPERATIONS_UPDATE)
  @ApiOperation({ summary: 'Submit activity for approval' })
  submitForApproval(
    @Param('projectId') projectId: string,
    @Param('activityId') activityId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.operationsService.submitForApproval(projectId, activityId, actor);
  }

  @Post('activities/:activityId/approve')
  @RequirePermissions(PERMISSIONS.OPERATIONS_APPROVE)
  @ApiOperation({ summary: 'Approve or reject an activity' })
  approveActivity(
    @Param('projectId') projectId: string,
    @Param('activityId') activityId: string,
    @Body() dto: ApproveActivityDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.operationsService.approveActivity(projectId, activityId, dto, actor);
  }

  @Get('schedules')
  @RequirePermissions(PERMISSIONS.OPERATIONS_VIEW)
  @ApiOperation({ summary: 'List project operation schedules' })
  findSchedules(
    @Param('projectId') projectId: string,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.operationsService.findSchedules(projectId, caller);
  }

  @Post('schedules')
  @RequirePermissions(PERMISSIONS.OPERATIONS_CREATE)
  @ApiOperation({ summary: 'Create project operation schedule' })
  createSchedule(
    @Param('projectId') projectId: string,
    @Body() dto: CreateScheduleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.operationsService.createSchedule(projectId, dto, actor);
  }

  @Patch('schedules/:scheduleId')
  @RequirePermissions(PERMISSIONS.OPERATIONS_UPDATE)
  @ApiOperation({ summary: 'Update project operation schedule' })
  updateSchedule(
    @Param('projectId') projectId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.operationsService.updateSchedule(projectId, scheduleId, dto, actor);
  }

  @Delete('schedules/:scheduleId')
  @RequirePermissions(PERMISSIONS.OPERATIONS_DELETE)
  @ApiOperation({ summary: 'Delete project operation schedule' })
  deleteSchedule(
    @Param('projectId') projectId: string,
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.operationsService.deleteSchedule(projectId, scheduleId, actor);
  }

  @Get('daily-logs')
  @RequirePermissions(PERMISSIONS.OPERATIONS_VIEW)
  @ApiOperation({ summary: 'List project daily logs' })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 25 })
  findDailyLogs(
    @Param('projectId') projectId: string,
    @CurrentUser() caller: AuthUser,
    @Query() query: ListDailyLogsQueryDto,
  ) {
    return this.operationsService.findDailyLogs(projectId, query, caller);
  }

  @Post('daily-logs')
  @RequirePermissions(PERMISSIONS.OPERATIONS_CREATE)
  @ApiOperation({ summary: 'Create or update a project daily log' })
  upsertDailyLog(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDailyLogDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.operationsService.upsertDailyLog(projectId, dto, actor);
  }

  @Patch('daily-logs/:logId')
  @RequirePermissions(PERMISSIONS.OPERATIONS_UPDATE)
  @ApiOperation({ summary: 'Update a project daily log' })
  updateDailyLog(
    @Param('projectId') projectId: string,
    @Param('logId') logId: string,
    @Body() dto: UpdateDailyLogDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.operationsService.updateDailyLog(projectId, logId, dto, actor);
  }
}
