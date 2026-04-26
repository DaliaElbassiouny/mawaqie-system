import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthUser, PERMISSIONS } from '@cdc/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  ListProcurementReadinessQueryDto,
  PROCUREMENT_REQUIREMENT_TYPES,
  REQUIREMENT_READINESS_STATUSES,
  UpdateProcurementRequirementDto,
  type ProcurementRequirementType,
} from './dto/operation.dto';
import { OperationsService } from './operations.service';

@ApiTags('Procurement Linkage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects/:projectId/procurement')
export class OperationsProcurementController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('readiness')
  @RequirePermissions(PERMISSIONS.PROCUREMENT_VIEW)
  @ApiOperation({ summary: 'List procurement-linked operation needs for a project' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'requirementType', required: false, enum: PROCUREMENT_REQUIREMENT_TYPES })
  @ApiQuery({ name: 'requirementStatus', required: false, enum: REQUIREMENT_READINESS_STATUSES })
  @ApiQuery({ name: 'blockedOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 25 })
  findProcurementReadiness(
    @Param('projectId') projectId: string,
    @CurrentUser() caller: AuthUser,
    @Query() query: ListProcurementReadinessQueryDto,
  ) {
    return this.operationsService.findProcurementReadiness(projectId, query, caller);
  }

  @Patch('readiness/:activityId/:requirementType')
  @RequirePermissions(PERMISSIONS.PROCUREMENT_UPDATE)
  @ApiOperation({ summary: 'Update procurement readiness for an operation requirement' })
  updateProcurementRequirement(
    @Param('projectId') projectId: string,
    @Param('activityId') activityId: string,
    @Param('requirementType') requirementType: ProcurementRequirementType,
    @Body() dto: UpdateProcurementRequirementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.operationsService.updateProcurementRequirement(
      projectId,
      activityId,
      requirementType,
      dto,
      actor,
    );
  }
}
