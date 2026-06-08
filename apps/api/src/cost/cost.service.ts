import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '@mawaqie/shared';
import { AuditService } from '../audit/audit.service';
import { PermissionScopeService } from '../common/services/permission-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCostItemDto,
  CreateExtractDto,
  CreateInvoiceDto,
  ListCostItemsQueryDto,
  ListExtractsQueryDto,
  ListInvoicesQueryDto,
  UpdateCostItemDto,
  UpdateExtractDto,
  UpdateInvoiceDto,
} from './dto/cost.dto';

const COST_ITEM_SELECT = {
  id: true,
  code: true,
  nameAr: true,
  nameEn: true,
  category: true,
  unit: true,
  quantity: true,
  unitCost: true,
  totalCost: true,
  currency: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CostItemSelect;

const INVOICE_SELECT = {
  id: true,
  invoiceNumber: true,
  date: true,
  vendor: true,
  description: true,
  amountBeforeTax: true,
  taxAmount: true,
  grossAmount: true,
  currency: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  costItem: { select: { id: true, code: true, nameAr: true } },
  creator: { select: { id: true, nameAr: true } },
} satisfies Prisma.InvoiceSelect;

const EXTRACT_SELECT = {
  id: true,
  extractNumber: true,
  date: true,
  description: true,
  amountBeforeTax: true,
  taxAmount: true,
  totalAmount: true,
  currency: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  creator: { select: { id: true, nameAr: true } },
} satisfies Prisma.ExtractSelect;

@Injectable()
export class CostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: PermissionScopeService,
  ) {}

  // ─── Access guard ─────────────────────────────────────────────────────────

  private async assertProjectAccess(projectId: string, caller: AuthUser): Promise<void> {
    const where = this.scope.buildProjectWhere(caller);
    const project = await this.prisma.project.findFirst({ where: { id: projectId, ...where } });
    if (!project) throw new ForbiddenException('Project not found or access denied');
  }

  // ─── Overview / Stats ─────────────────────────────────────────────────────

  async getOverview(projectId: string, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const [project, costItems, invoices, extracts] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, code: true, nameAr: true, contractValue: true, currency: true },
      }),
      this.prisma.costItem.findMany({
        where: { projectId },
        select: { totalCost: true, category: true },
      }),
      this.prisma.invoice.findMany({
        where: { projectId },
        select: { grossAmount: true, status: true },
      }),
      this.prisma.extract.findMany({
        where: { projectId },
        select: { totalAmount: true, status: true },
      }),
    ]);

    if (!project) throw new NotFoundException('Project not found');

    const budgetTotal = costItems.reduce(
      (sum, ci) => sum + Number(ci.totalCost ?? 0),
      0,
    );

    const invoiceTotal = invoices.reduce(
      (sum, inv) => sum + Number(inv.grossAmount),
      0,
    );
    const invoicePaid = invoices
      .filter((inv) => inv.status === 'PAID')
      .reduce((sum, inv) => sum + Number(inv.grossAmount), 0);

    const extractTotal = extracts.reduce(
      (sum, ext) => sum + Number(ext.totalAmount),
      0,
    );
    const extractPaid = extracts
      .filter((ext) => ext.status === 'PAID')
      .reduce((sum, ext) => sum + Number(ext.totalAmount), 0);

    const contractValue = Number(project.contractValue ?? 0);

    const categoryBreakdown: Record<string, number> = {};
    for (const ci of costItems) {
      categoryBreakdown[ci.category] = (categoryBreakdown[ci.category] ?? 0) + Number(ci.totalCost ?? 0);
    }

    const invoicesByStatus = {
      DRAFT: 0, SUBMITTED: 0, APPROVED: 0, PAID: 0,
    };
    for (const inv of invoices) {
      invoicesByStatus[inv.status] = (invoicesByStatus[inv.status] ?? 0) + 1;
    }

    return {
      project,
      stats: {
        contractValue,
        budgetTotal,
        budgetUtilization: budgetTotal > 0 ? (invoiceTotal / budgetTotal) * 100 : 0,
        invoiceTotal,
        invoicePaid,
        invoicePending: invoiceTotal - invoicePaid,
        extractTotal,
        extractPaid,
        extractPending: extractTotal - extractPaid,
        invoiceCount: invoices.length,
        extractCount: extracts.length,
        costItemCount: costItems.length,
      },
      categoryBreakdown,
      invoicesByStatus,
    };
  }

  // ─── Cost Items ───────────────────────────────────────────────────────────

  async listCostItems(projectId: string, query: ListCostItemsQueryDto, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.CostItemWhereInput = { projectId };
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { nameAr: { contains: query.search, mode: 'insensitive' } },
        { nameEn: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.costItem.findMany({ where, select: COST_ITEM_SELECT, skip, take: limit, orderBy: { code: 'asc' } }),
      this.prisma.costItem.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createCostItem(projectId: string, dto: CreateCostItemDto, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const existing = await this.prisma.costItem.findUnique({ where: { projectId_code: { projectId, code: dto.code } } });
    if (existing) throw new BadRequestException(`Cost item code '${dto.code}' already exists in this project`);

    const qty = dto.quantity != null ? new Prisma.Decimal(dto.quantity) : null;
    const unitCost = dto.unitCost != null ? new Prisma.Decimal(dto.unitCost) : null;
    const totalCost = qty && unitCost ? qty.mul(unitCost) : null;

    const item = await this.prisma.costItem.create({
      data: {
        projectId,
        code: dto.code,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        category: dto.category,
        unit: dto.unit,
        quantity: qty,
        unitCost,
        totalCost,
        currency: dto.currency ?? 'SAR',
        notes: dto.notes,
      },
      select: COST_ITEM_SELECT,
    });

    await this.audit.log({ userId: caller.id, action: 'CREATE', module: 'cost', entityType: 'CostItem', entityId: item.id, newData: item });
    return item;
  }

  async updateCostItem(projectId: string, itemId: string, dto: UpdateCostItemDto, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const existing = await this.prisma.costItem.findFirst({ where: { id: itemId, projectId } });
    if (!existing) throw new NotFoundException('Cost item not found');

    const qty = dto.quantity != null ? new Prisma.Decimal(dto.quantity) : undefined;
    const unitCost = dto.unitCost != null ? new Prisma.Decimal(dto.unitCost) : undefined;

    const effectiveQty = qty ?? existing.quantity;
    const effectiveUnitCost = unitCost ?? existing.unitCost;
    const totalCost = effectiveQty && effectiveUnitCost
      ? new Prisma.Decimal(effectiveQty).mul(new Prisma.Decimal(effectiveUnitCost))
      : existing.totalCost;

    const updated = await this.prisma.costItem.update({
      where: { id: itemId },
      data: {
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        category: dto.category,
        unit: dto.unit,
        quantity: qty,
        unitCost,
        totalCost,
        currency: dto.currency,
        notes: dto.notes,
      },
      select: COST_ITEM_SELECT,
    });

    await this.audit.log({ userId: caller.id, action: 'UPDATE', module: 'cost', entityType: 'CostItem', entityId: itemId, oldData: existing, newData: dto as unknown as Record<string, unknown> });
    return updated;
  }

  async deleteCostItem(projectId: string, itemId: string, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const existing = await this.prisma.costItem.findFirst({ where: { id: itemId, projectId } });
    if (!existing) throw new NotFoundException('Cost item not found');

    await this.prisma.costItem.delete({ where: { id: itemId } });
    await this.audit.log({ userId: caller.id, action: 'DELETE', module: 'cost', entityType: 'CostItem', entityId: itemId });
    return { id: itemId };
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────

  async listInvoices(projectId: string, query: ListInvoicesQueryDto, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = { projectId };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { vendor: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, select: INVOICE_SELECT, skip, take: limit, orderBy: { date: 'desc' } }),
      this.prisma.invoice.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createInvoice(projectId: string, dto: CreateInvoiceDto, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const existing = await this.prisma.invoice.findUnique({
      where: { projectId_invoiceNumber: { projectId, invoiceNumber: dto.invoiceNumber } },
    });
    if (existing) throw new BadRequestException(`Invoice number '${dto.invoiceNumber}' already exists`);

    const amountBeforeTax = new Prisma.Decimal(dto.amountBeforeTax);
    const taxAmount = new Prisma.Decimal(dto.taxAmount ?? '0');
    const grossAmount = amountBeforeTax.add(taxAmount);

    const invoice = await this.prisma.invoice.create({
      data: {
        projectId,
        invoiceNumber: dto.invoiceNumber,
        date: new Date(dto.date),
        vendor: dto.vendor,
        costItemId: dto.costItemId,
        description: dto.description,
        amountBeforeTax,
        taxAmount,
        grossAmount,
        currency: dto.currency ?? 'SAR',
        notes: dto.notes,
        createdById: caller.id,
      },
      select: INVOICE_SELECT,
    });

    await this.audit.log({ userId: caller.id, action: 'CREATE', module: 'cost', entityType: 'Invoice', entityId: invoice.id, newData: invoice });
    return invoice;
  }

  async updateInvoice(projectId: string, invoiceId: string, dto: UpdateInvoiceDto, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const existing = await this.prisma.invoice.findFirst({ where: { id: invoiceId, projectId } });
    if (!existing) throw new NotFoundException('Invoice not found');

    const amountBeforeTax = dto.amountBeforeTax != null ? new Prisma.Decimal(dto.amountBeforeTax) : existing.amountBeforeTax;
    const taxAmount = dto.taxAmount != null ? new Prisma.Decimal(dto.taxAmount) : existing.taxAmount;
    const grossAmount = new Prisma.Decimal(amountBeforeTax).add(new Prisma.Decimal(taxAmount));

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        invoiceNumber: dto.invoiceNumber,
        date: dto.date ? new Date(dto.date) : undefined,
        vendor: dto.vendor,
        costItemId: dto.costItemId,
        description: dto.description,
        amountBeforeTax: dto.amountBeforeTax ? new Prisma.Decimal(dto.amountBeforeTax) : undefined,
        taxAmount: dto.taxAmount ? new Prisma.Decimal(dto.taxAmount) : undefined,
        grossAmount,
        currency: dto.currency,
        status: dto.status,
        notes: dto.notes,
      },
      select: INVOICE_SELECT,
    });

    await this.audit.log({ userId: caller.id, action: 'UPDATE', module: 'cost', entityType: 'Invoice', entityId: invoiceId, oldData: existing, newData: dto as unknown as Record<string, unknown> });
    return updated;
  }

  async deleteInvoice(projectId: string, invoiceId: string, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const existing = await this.prisma.invoice.findFirst({ where: { id: invoiceId, projectId } });
    if (!existing) throw new NotFoundException('Invoice not found');

    await this.prisma.invoice.delete({ where: { id: invoiceId } });
    await this.audit.log({ userId: caller.id, action: 'DELETE', module: 'cost', entityType: 'Invoice', entityId: invoiceId });
    return { id: invoiceId };
  }

  // ─── Extracts ─────────────────────────────────────────────────────────────

  async listExtracts(projectId: string, query: ListExtractsQueryDto, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ExtractWhereInput = { projectId };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { extractNumber: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.extract.findMany({ where, select: EXTRACT_SELECT, skip, take: limit, orderBy: { date: 'desc' } }),
      this.prisma.extract.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createExtract(projectId: string, dto: CreateExtractDto, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const existing = await this.prisma.extract.findUnique({
      where: { projectId_extractNumber: { projectId, extractNumber: dto.extractNumber } },
    });
    if (existing) throw new BadRequestException(`Extract number '${dto.extractNumber}' already exists`);

    const amountBeforeTax = new Prisma.Decimal(dto.amountBeforeTax);
    const taxAmount = new Prisma.Decimal(dto.taxAmount ?? '0');
    const totalAmount = amountBeforeTax.add(taxAmount);

    const extract = await this.prisma.extract.create({
      data: {
        projectId,
        extractNumber: dto.extractNumber,
        date: new Date(dto.date),
        description: dto.description,
        amountBeforeTax,
        taxAmount,
        totalAmount,
        currency: dto.currency ?? 'SAR',
        notes: dto.notes,
        createdById: caller.id,
      },
      select: EXTRACT_SELECT,
    });

    await this.audit.log({ userId: caller.id, action: 'CREATE', module: 'cost', entityType: 'Extract', entityId: extract.id, newData: extract });
    return extract;
  }

  async updateExtract(projectId: string, extractId: string, dto: UpdateExtractDto, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const existing = await this.prisma.extract.findFirst({ where: { id: extractId, projectId } });
    if (!existing) throw new NotFoundException('Extract not found');

    const amountBeforeTax = dto.amountBeforeTax != null ? new Prisma.Decimal(dto.amountBeforeTax) : existing.amountBeforeTax;
    const taxAmount = dto.taxAmount != null ? new Prisma.Decimal(dto.taxAmount) : existing.taxAmount;
    const totalAmount = new Prisma.Decimal(amountBeforeTax).add(new Prisma.Decimal(taxAmount));

    const updated = await this.prisma.extract.update({
      where: { id: extractId },
      data: {
        extractNumber: dto.extractNumber,
        date: dto.date ? new Date(dto.date) : undefined,
        description: dto.description,
        amountBeforeTax: dto.amountBeforeTax ? new Prisma.Decimal(dto.amountBeforeTax) : undefined,
        taxAmount: dto.taxAmount ? new Prisma.Decimal(dto.taxAmount) : undefined,
        totalAmount,
        currency: dto.currency,
        status: dto.status,
        notes: dto.notes,
      },
      select: EXTRACT_SELECT,
    });

    await this.audit.log({ userId: caller.id, action: 'UPDATE', module: 'cost', entityType: 'Extract', entityId: extractId, oldData: existing, newData: dto as unknown as Record<string, unknown> });
    return updated;
  }

  async deleteExtract(projectId: string, extractId: string, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const existing = await this.prisma.extract.findFirst({ where: { id: extractId, projectId } });
    if (!existing) throw new NotFoundException('Extract not found');

    await this.prisma.extract.delete({ where: { id: extractId } });
    await this.audit.log({ userId: caller.id, action: 'DELETE', module: 'cost', entityType: 'Extract', entityId: extractId });
    return { id: extractId };
  }
}
