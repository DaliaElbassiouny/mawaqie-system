import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '@cdc/shared';
import { AuditService } from '../audit/audit.service';
import { PermissionScopeService } from '../common/services/permission-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreatePurchaseRequestDto,
  ListPurchaseRequestsQueryDto,
  UpdatePurchaseRequestDto,
} from './dto/procurement.dto';

const PR_SELECT = {
  id: true,
  prNumber: true,
  nameAr: true,
  nameEn: true,
  description: true,
  requirementType: true,
  priority: true,
  status: true,
  currency: true,
  quantity: true,
  unit: true,
  totalAmount: true,
  vendor: true,
  expectedDeliveryDate: true,
  actualDeliveryDate: true,
  notes: true,
  approvalNote: true,
  approvedAt: true,
  requestedAt: true,
  updatedAt: true,
  project: { select: { id: true, code: true, nameAr: true, nameEn: true } },
  activity: { select: { id: true, code: true, nameAr: true, status: true } },
  requester: { select: { id: true, nameAr: true, nameEn: true } },
  approvedBy: { select: { id: true, nameAr: true } },
} satisfies Prisma.PurchaseRequestSelect;

@Injectable()
export class ProcurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scope: PermissionScopeService,
    private readonly notifications: NotificationsService,
  ) {}

  private async scopedProjectIds(caller: AuthUser): Promise<string[] | 'all'> {
    if (this.scope.hasGlobalAccess(caller)) return 'all';
    const projects = await this.prisma.project.findMany({
      where: this.scope.buildProjectWhere(caller),
      select: { id: true },
    });
    return projects.map((p) => p.id);
  }

  private buildProjectFilter(projectIds: string[] | 'all'): Prisma.PurchaseRequestWhereInput {
    return projectIds === 'all' ? {} : { projectId: { in: projectIds } };
  }

  // ─── Dashboard / KPIs ──────────────────────────────────────────────────────

  async getDashboard(caller: AuthUser) {
    const projectIds = await this.scopedProjectIds(caller);
    const scopeFilter = this.buildProjectFilter(projectIds);

    const [total, byStatus, byPriority, byType, recentRequests] = await Promise.all([
      this.prisma.purchaseRequest.count({ where: scopeFilter }),
      this.prisma.purchaseRequest.groupBy({
        by: ['status'],
        where: scopeFilter,
        _count: { id: true },
      }),
      this.prisma.purchaseRequest.groupBy({
        by: ['priority'],
        where: scopeFilter,
        _count: { id: true },
      }),
      this.prisma.purchaseRequest.groupBy({
        by: ['requirementType'],
        where: scopeFilter,
        _count: { id: true },
      }),
      this.prisma.purchaseRequest.findMany({
        where: scopeFilter,
        orderBy: { requestedAt: 'desc' },
        take: 8,
        select: PR_SELECT,
      }),
    ]);

    const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r._count.id]));

    return {
      summary: {
        total,
        draft: statusMap['DRAFT'] ?? 0,
        submitted: statusMap['SUBMITTED'] ?? 0,
        underReview: statusMap['UNDER_REVIEW'] ?? 0,
        approved: statusMap['APPROVED'] ?? 0,
        rejected: statusMap['REJECTED'] ?? 0,
        fulfilled: (statusMap['FULFILLED'] ?? 0) + (statusMap['RECEIVED'] ?? 0),
        pendingApproval: (statusMap['SUBMITTED'] ?? 0) + (statusMap['UNDER_REVIEW'] ?? 0),
      },
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count.id })),
      byPriority: byPriority.map((r) => ({ priority: r.priority, count: r._count.id })),
      byType: byType.map((r) => ({ type: r.requirementType, count: r._count.id })),
      recentRequests,
    };
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  async listRequests(query: ListPurchaseRequestsQueryDto, caller: AuthUser) {
    const projectIds = await this.scopedProjectIds(caller);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseRequestWhereInput = {
      ...this.buildProjectFilter(projectIds),
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.activityId && { activityId: query.activityId }),
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.requirementType && { requirementType: query.requirementType }),
      ...(query.search && {
        OR: [
          { nameAr: { contains: query.search, mode: 'insensitive' } },
          { nameEn: { contains: query.search, mode: 'insensitive' } },
          { prNumber: { contains: query.search, mode: 'insensitive' } },
          { vendor: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.startDate && { requestedAt: { gte: new Date(query.startDate) } }),
      ...(query.endDate && { requestedAt: { lte: new Date(query.endDate) } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where,
        select: PR_SELECT,
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Get By ID ─────────────────────────────────────────────────────────────

  async getById(id: string, caller: AuthUser) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: PR_SELECT,
    });
    if (!pr) throw new NotFoundException('طلب الشراء غير موجود');

    const projectIds = await this.scopedProjectIds(caller);
    if (projectIds !== 'all' && !projectIds.includes(pr.project.id)) {
      throw new ForbiddenException('لا تملك صلاحية للوصول لهذا الطلب');
    }

    return pr;
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async createRequest(dto: CreatePurchaseRequestDto, caller: AuthUser) {
    const projectIds = await this.scopedProjectIds(caller);
    if (projectIds !== 'all' && !projectIds.includes(dto.projectId)) {
      throw new ForbiddenException('لا تملك صلاحية لإنشاء طلبات شراء في هذا المشروع');
    }

    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('المشروع غير موجود');

    if (dto.activityId) {
      const activity = await this.prisma.operationActivity.findFirst({
        where: { id: dto.activityId, projectId: dto.projectId },
      });
      if (!activity) throw new BadRequestException('النشاط التشغيلي غير موجود في هذا المشروع');
    }

    const lastPR = await this.prisma.purchaseRequest.findFirst({
      orderBy: { prNumber: 'desc' },
      select: { prNumber: true },
    });

    let nextNum = 1;
    if (lastPR?.prNumber) {
      const match = lastPR.prNumber.match(/PR-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const prNumber = `PR-${String(nextNum).padStart(4, '0')}`;

    const { Decimal } = await import('@prisma/client/runtime/library');

    const pr = await this.prisma.purchaseRequest.create({
      data: {
        prNumber,
        projectId: dto.projectId,
        activityId: dto.activityId ?? null,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn ?? null,
        description: dto.description ?? null,
        requirementType: dto.requirementType ?? 'OTHER',
        priority: (dto.priority as any) ?? 'MEDIUM',
        currency: dto.currency ?? 'SAR',
        quantity: dto.quantity != null ? new Decimal(dto.quantity) : null,
        unit: dto.unit ?? null,
        totalAmount: dto.totalAmount != null ? new Decimal(dto.totalAmount) : null,
        vendor: dto.vendor ?? null,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        notes: dto.notes ?? null,
        requestedById: caller.id,
      },
      select: PR_SELECT,
    });

    await this.audit.log({
      userId: caller.id,
      action: 'CREATE',
      module: 'procurement',
      entityType: 'PurchaseRequest',
      entityId: pr.id,
      newData: pr as unknown as Record<string, unknown>,
    });

    return pr;
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async updateRequest(id: string, dto: UpdatePurchaseRequestDto, caller: AuthUser) {
    const existing = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: { id: true, projectId: true, status: true, requestedById: true },
    });
    if (!existing) throw new NotFoundException('طلب الشراء غير موجود');

    const projectIds = await this.scopedProjectIds(caller);
    if (projectIds !== 'all' && !projectIds.includes(existing.projectId)) {
      throw new ForbiddenException('لا تملك صلاحية لتعديل هذا الطلب');
    }

    const { Decimal } = await import('@prisma/client/runtime/library');

    const updateData: Prisma.PurchaseRequestUpdateInput = {
      ...(dto.nameAr && { nameAr: dto.nameAr }),
      ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.requirementType && { requirementType: dto.requirementType }),
      ...(dto.priority && { priority: dto.priority as any }),
      ...(dto.status && { status: dto.status }),
      ...(dto.unit !== undefined && { unit: dto.unit }),
      ...(dto.quantity != null && { quantity: new Decimal(dto.quantity) }),
      ...(dto.totalAmount != null && { totalAmount: new Decimal(dto.totalAmount) }),
      ...(dto.vendor !== undefined && { vendor: dto.vendor }),
      ...(dto.expectedDeliveryDate && { expectedDeliveryDate: new Date(dto.expectedDeliveryDate) }),
      ...(dto.actualDeliveryDate && { actualDeliveryDate: new Date(dto.actualDeliveryDate) }),
      ...(dto.approvalNote !== undefined && { approvalNote: dto.approvalNote }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.activityId !== undefined && {
        activity: dto.activityId ? { connect: { id: dto.activityId } } : { disconnect: true },
      }),
    };

    if (dto.status === 'APPROVED' && existing.status !== 'APPROVED') {
      updateData.approvedBy = { connect: { id: caller.id } };
      updateData.approvedAt = new Date();
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: updateData,
      select: PR_SELECT,
    });

    await this.audit.log({
      userId: caller.id,
      action: 'UPDATE',
      module: 'procurement',
      entityType: 'PurchaseRequest',
      entityId: id,
      newData: updated as unknown as Record<string, unknown>,
    });

    if (dto.status && existing.requestedById && dto.status !== existing.status) {
      const statusLabels: Record<string, string> = {
        APPROVED: 'تمت الموافقة على طلب الشراء',
        REJECTED: 'تم رفض طلب الشراء',
        UNDER_REVIEW: 'طلب الشراء قيد المراجعة',
        FULFILLED: 'تم تنفيذ طلب الشراء',
        RECEIVED: 'تم استلام مواد طلب الشراء',
      };
      const title = statusLabels[dto.status];
      if (title && existing.requestedById !== caller.id) {
        await this.notifications.create({
          userId: existing.requestedById,
          title,
          body: updated.nameAr,
          type: dto.status === 'APPROVED' || dto.status === 'FULFILLED' ? 'SUCCESS'
               : dto.status === 'REJECTED' ? 'WARNING' : 'INFO',
          entityType: 'purchase_request',
          entityId: id,
          route: `/procurement`,
        });
      }
    }

    return updated;
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async deleteRequest(id: string, caller: AuthUser) {
    const existing = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: { id: true, projectId: true, status: true },
    });
    if (!existing) throw new NotFoundException('طلب الشراء غير موجود');

    const projectIds = await this.scopedProjectIds(caller);
    if (projectIds !== 'all' && !projectIds.includes(existing.projectId)) {
      throw new ForbiddenException('لا تملك صلاحية لحذف هذا الطلب');
    }

    if (!['DRAFT', 'REJECTED', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestException('لا يمكن حذف طلب بحالة ' + existing.status);
    }

    await this.prisma.purchaseRequest.delete({ where: { id } });

    await this.audit.log({
      userId: caller.id,
      action: 'DELETE',
      module: 'procurement',
      entityType: 'PurchaseRequest',
      entityId: id,
    });

    return { success: true };
  }
}
