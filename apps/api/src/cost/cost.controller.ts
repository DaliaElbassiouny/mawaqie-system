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
import { PERMISSIONS } from '@mawaqie/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthUser } from '@mawaqie/shared';
import { CostService } from './cost.service';
import {
  CreateCostItemDto,
  CreateExtractDto,
  CreateInvoiceDto,
  EXTRACT_STATUSES,
  INVOICE_STATUSES,
  ListCostItemsQueryDto,
  ListExtractsQueryDto,
  ListInvoicesQueryDto,
  UpdateCostItemDto,
  UpdateExtractDto,
  UpdateInvoiceDto,
} from './dto/cost.dto';

@ApiTags('Cost Control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects/:projectId/cost')
export class CostController {
  constructor(private readonly costService: CostService) {}

  // ─── Overview ─────────────────────────────────────────────────────────────

  @Get('overview')
  @RequirePermissions(PERMISSIONS.COST_VIEW)
  @ApiOperation({ summary: 'Project cost overview and dashboard stats' })
  getOverview(
    @Param('projectId') projectId: string,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.getOverview(projectId, caller);
  }

  // ─── Cost Items ───────────────────────────────────────────────────────────

  @Get('items')
  @RequirePermissions(PERMISSIONS.COST_VIEW)
  @ApiOperation({ summary: 'List cost items for a project' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  listCostItems(
    @Param('projectId') projectId: string,
    @Query() query: ListCostItemsQueryDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.listCostItems(projectId, query, caller);
  }

  @Post('items')
  @RequirePermissions(PERMISSIONS.COST_CREATE)
  @ApiOperation({ summary: 'Create a cost item' })
  createCostItem(
    @Param('projectId') projectId: string,
    @Body() dto: CreateCostItemDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.createCostItem(projectId, dto, caller);
  }

  @Patch('items/:itemId')
  @RequirePermissions(PERMISSIONS.COST_UPDATE)
  @ApiOperation({ summary: 'Update a cost item' })
  updateCostItem(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCostItemDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.updateCostItem(projectId, itemId, dto, caller);
  }

  @Delete('items/:itemId')
  @RequirePermissions(PERMISSIONS.COST_UPDATE)
  @ApiOperation({ summary: 'Delete a cost item' })
  deleteCostItem(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.deleteCostItem(projectId, itemId, caller);
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────

  @Get('invoices')
  @RequirePermissions(PERMISSIONS.COST_VIEW)
  @ApiOperation({ summary: 'List invoices for a project' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: INVOICE_STATUSES })
  @ApiQuery({ name: 'search', required: false })
  listInvoices(
    @Param('projectId') projectId: string,
    @Query() query: ListInvoicesQueryDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.listInvoices(projectId, query, caller);
  }

  @Post('invoices')
  @RequirePermissions(PERMISSIONS.COST_CREATE)
  @ApiOperation({ summary: 'Create an invoice' })
  createInvoice(
    @Param('projectId') projectId: string,
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.createInvoice(projectId, dto, caller);
  }

  @Patch('invoices/:invoiceId')
  @RequirePermissions(PERMISSIONS.COST_UPDATE)
  @ApiOperation({ summary: 'Update an invoice (including status changes)' })
  updateInvoice(
    @Param('projectId') projectId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.updateInvoice(projectId, invoiceId, dto, caller);
  }

  @Delete('invoices/:invoiceId')
  @RequirePermissions(PERMISSIONS.COST_UPDATE)
  @ApiOperation({ summary: 'Delete an invoice' })
  deleteInvoice(
    @Param('projectId') projectId: string,
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.deleteInvoice(projectId, invoiceId, caller);
  }

  // ─── Extracts ─────────────────────────────────────────────────────────────

  @Get('extracts')
  @RequirePermissions(PERMISSIONS.COST_VIEW)
  @ApiOperation({ summary: 'List extracts (مستخلصات) for a project' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: EXTRACT_STATUSES })
  @ApiQuery({ name: 'search', required: false })
  listExtracts(
    @Param('projectId') projectId: string,
    @Query() query: ListExtractsQueryDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.listExtracts(projectId, query, caller);
  }

  @Post('extracts')
  @RequirePermissions(PERMISSIONS.COST_CREATE)
  @ApiOperation({ summary: 'Create an extract (مستخلص)' })
  createExtract(
    @Param('projectId') projectId: string,
    @Body() dto: CreateExtractDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.createExtract(projectId, dto, caller);
  }

  @Patch('extracts/:extractId')
  @RequirePermissions(PERMISSIONS.COST_UPDATE)
  @ApiOperation({ summary: 'Update an extract (including status changes)' })
  updateExtract(
    @Param('projectId') projectId: string,
    @Param('extractId') extractId: string,
    @Body() dto: UpdateExtractDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.updateExtract(projectId, extractId, dto, caller);
  }

  @Delete('extracts/:extractId')
  @RequirePermissions(PERMISSIONS.COST_UPDATE)
  @ApiOperation({ summary: 'Delete an extract' })
  deleteExtract(
    @Param('projectId') projectId: string,
    @Param('extractId') extractId: string,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.costService.deleteExtract(projectId, extractId, caller);
  }
}
