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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@cdc/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthUser } from '@cdc/shared';
import { ProcurementService } from './procurement.service';
import {
  CreatePurchaseRequestDto,
  ListPurchaseRequestsQueryDto,
  UpdatePurchaseRequestDto,
} from './dto/procurement.dto';

@ApiTags('Procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.PROCUREMENT_VIEW)
  @ApiOperation({ summary: 'Procurement dashboard KPIs and summary' })
  getDashboard(@CurrentUser() caller: AuthUser) {
    return this.service.getDashboard(caller);
  }

  @Get('requests')
  @RequirePermissions(PERMISSIONS.PROCUREMENT_VIEW)
  @ApiOperation({ summary: 'List purchase requests with filters' })
  listRequests(
    @Query() query: ListPurchaseRequestsQueryDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.service.listRequests(query, caller);
  }

  @Get('requests/:id')
  @RequirePermissions(PERMISSIONS.PROCUREMENT_VIEW)
  @ApiOperation({ summary: 'Get purchase request by ID' })
  getById(@Param('id') id: string, @CurrentUser() caller: AuthUser) {
    return this.service.getById(id, caller);
  }

  @Post('requests')
  @RequirePermissions(PERMISSIONS.PROCUREMENT_CREATE)
  @ApiOperation({ summary: 'Create a purchase request' })
  createRequest(
    @Body() dto: CreatePurchaseRequestDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.service.createRequest(dto, caller);
  }

  @Patch('requests/:id')
  @RequirePermissions(PERMISSIONS.PROCUREMENT_UPDATE)
  @ApiOperation({ summary: 'Update a purchase request (including status)' })
  updateRequest(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseRequestDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.service.updateRequest(id, dto, caller);
  }

  @Delete('requests/:id')
  @RequirePermissions(PERMISSIONS.PROCUREMENT_UPDATE)
  @ApiOperation({ summary: 'Delete a purchase request (DRAFT/REJECTED/CANCELLED only)' })
  deleteRequest(@Param('id') id: string, @CurrentUser() caller: AuthUser) {
    return this.service.deleteRequest(id, caller);
  }
}
