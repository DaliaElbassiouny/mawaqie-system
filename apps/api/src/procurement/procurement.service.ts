import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PRApprovalStage, PRStatus } from '@prisma/client';
import { AuthUser } from '@cdc/shared';
import { AuditService } from '../audit/audit.service';
import { PermissionScopeService } from '../common/services/permission-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ApproveRejectPRDto,
  CreatePurchaseRequestDto,
  ListPurchaseRequestsQueryDto,
  SubmitPRDto,
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
  currentStage: true,
  currency: true,
  quantity: true,
  unit: true,
  totalAmount: true,
  vendor: true,
  expectedDeliveryDate: true,
  actualDeliveryDate: true,
  notes: true,
  requestedAt: true,
  updatedAt: true,
  project: { select: { id: true, code: true, nameAr: true, nameEn: true } },
  activity: { select: { id: true, code: true, nameAr: true, status: true } },
  requester: { select: { id: true, nameAr: true, nameEn: true } },
} satisfies Prisma.PurchaseRequestSelect;

const PR_DETAIL_SELECT = {
  id: true,
  prNumber: true,
  nameAr: true,
  nameEn: true,
  description: true,
  requirementType: true,
  priority: true,
  status: true,
  currentStage: true,
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
  items: {
    select: {
      id: true,
      lineNumber: true,
      titleAr: true,
      titleEn: true,
      description: true,
      quantity: true,
      unit: true,
      unitPrice: true,
      estimatedTotal: true,
      approvedQuantity: true,
      approvedUnitPrice: true,
      approvedTotal: true,
      notes: true,
    },
    orderBy: { lineNumber: 'asc' as const },
  },
  approvalSteps: {
    select: {
      id: true,
      stage: true,
      status: true,
      note: true,
      decidedAt: true,
      createdAt: true,
      actor: { select: { id: true, nameAr: true, nameEn: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.PurchaseRequestSelect;

const WORKFLOW_STAGES: PRApprovalStage[] = [
  'PROCUREMENT_REVIEW',
  'COST_REVIEW',
  'PM_REVIEW',
  'FINAL_REVIEW',
];

// Stage → roles allowed to act
const STAGE_ROLES: Record<PRApprovalStage, string[]> = {
  DRAFT: [],
  PROCUREMENT_REVIEW: ['PROCUREMENT_OFFICER', 'ADMIN', 'SUPER_ADMIN'],
  COST_REVIEW: ['COST_CONTROLLER', 'ADMIN', 'SUPER_ADMIN'],
  PM_REVIEW: ['PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'],
  FINAL_REVIEW: ['ADMIN', 'SUPER_ADMIN'],
  COMPLETED: [],
  REJECTED: [],
};

// Stage → next stage on approve + new PR status
const STAGE_TRANSITIONS: Record<PRApprovalStage, { next: PRApprovalStage; status: PRStatus } | null> = {
  DRAFT: null,
  PROCUREMENT_REVIEW: { next: 'COST_REVIEW', status: 'UNDER_REVIEW' },
  COST_REVIEW: { next: 'PM_REVIEW', status: 'PENDING_APPROVAL' },
  PM_REVIEW: { next: 'FINAL_REVIEW', status: 'PENDING_APPROVAL' },
  FINAL_REVIEW: { next: 'COMPLETED', status: 'APPROVED' },
  COMPLETED: null,
  REJECTED: null,
};

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

  private toDecimal(value?: number | null) {
    if (value == null) return null;
    return new Prisma.Decimal(value);
  }

  private buildDefaultItems(dto: CreatePurchaseRequestDto) {
    return [
      {
        titleAr: dto.nameAr,
        titleEn: dto.nameEn ?? null,
        description: dto.description ?? null,
        quantity: this.toDecimal(dto.quantity),
        unit: dto.unit ?? null,
        unitPrice:
          dto.totalAmount != null && dto.quantity && dto.quantity > 0
            ? this.toDecimal(dto.totalAmount / dto.quantity)
            : null,
        estimatedTotal: this.toDecimal(dto.totalAmount),
        approvedQuantity: null,
        approvedUnitPrice: null,
        approvedTotal: null,
        notes: dto.notes ?? null,
      },
    ];
  }

  private buildItemRows(dto: CreatePurchaseRequestDto) {
    const sourceItems =
      dto.items && dto.items.length > 0
        ? dto.items.map((item, idx) => {
            const qty = this.toDecimal(item.quantity);
            const unitPrice = this.toDecimal(item.unitPrice);

            // Compute estimatedTotal server-side when both components are present
            let estimatedTotal: Prisma.Decimal | null;
            if (qty && unitPrice) {
              estimatedTotal = qty.mul(unitPrice);
              // Reject if the client sent a value that conflicts with the computed total
              if (
                item.estimatedTotal != null &&
                !estimatedTotal.equals(new Prisma.Decimal(item.estimatedTotal))
              ) {
                throw new BadRequestException(
                  `البند ${idx + 1}: الإجمالي المقدر لا يتطابق مع حاصل ضرب الكمية × السعر`,
                );
              }
            } else {
              estimatedTotal = this.toDecimal(item.estimatedTotal);
            }

            return {
              titleAr: item.titleAr,
              titleEn: item.titleEn ?? null,
              description: item.description ?? null,
              quantity: qty,
              unit: item.unit ?? null,
              unitPrice,
              estimatedTotal,
              approvedQuantity: this.toDecimal(item.approvedQuantity),
              approvedUnitPrice: this.toDecimal(item.approvedUnitPrice),
              approvedTotal: this.toDecimal(item.approvedTotal),
              notes: item.notes ?? null,
            };
          })
        : this.buildDefaultItems(dto);

    return sourceItems.map((item, index) => ({
      lineNumber: index + 1,
      ...item,
    }));
  }

  private buildInitialApprovalSteps() {
    return WORKFLOW_STAGES.map((stage) => ({
      stage,
      status: 'PENDING' as const,
    }));
  }

  private async generateNextPrNumber(year = new Date().getFullYear()) {
    const prefix = `PR-${year}-`;
    const existing = await this.prisma.purchaseRequest.findMany({
      where: { prNumber: { startsWith: prefix } },
      select: { prNumber: true },
    });

    let maxSuffix = 0;
    for (const request of existing) {
      const match = request.prNumber.match(/(\d+)(?!.*\d)/);
      if (!match) continue;
      const suffix = parseInt(match[1], 10);
      if (!Number.isNaN(suffix) && suffix > maxSuffix) {
        maxSuffix = suffix;
      }
    }

    return `${prefix}${String(maxSuffix + 1).padStart(3, '0')}`;
  }

  private isPrNumberConflict(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      String(error.meta?.target ?? '').includes('prNumber')
    );
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
      select: PR_DETAIL_SELECT,
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

    const submitOnCreate = !dto.saveAsDraft;
    const itemRows = this.buildItemRows(dto);
    let pr: Prisma.PurchaseRequestGetPayload<{ select: typeof PR_DETAIL_SELECT }> | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const prNumber = await this.generateNextPrNumber();

      try {
        pr = await this.prisma.purchaseRequest.create({
          data: {
            prNumber,
            projectId: dto.projectId,
            activityId: dto.activityId ?? null,
            nameAr: dto.nameAr,
            nameEn: dto.nameEn ?? null,
            description: dto.description ?? null,
            requirementType: dto.requirementType ?? 'OTHER',
            priority: (dto.priority as any) ?? 'MEDIUM',
            status: submitOnCreate ? 'SUBMITTED' : 'DRAFT',
            currentStage: submitOnCreate ? 'PROCUREMENT_REVIEW' : 'DRAFT',
            currency: dto.currency ?? 'SAR',
            quantity: this.toDecimal(dto.quantity),
            unit: dto.unit ?? null,
            totalAmount: this.toDecimal(dto.totalAmount),
            vendor: dto.vendor ?? null,
            expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
            notes: dto.notes ?? null,
            requestedById: caller.id,
            items: {
              create: itemRows,
            },
            ...(submitOnCreate
              ? {
                  approvalSteps: {
                    createMany: {
                      data: this.buildInitialApprovalSteps(),
                    },
                  },
                }
              : {}),
          },
          select: PR_DETAIL_SELECT,
        });
        break;
      } catch (error) {
        if (!this.isPrNumberConflict(error)) {
          throw error;
        }

        if (attempt === 2) {
          throw new BadRequestException('تعذر توليد رقم طلب شراء جديد. أعد المحاولة.');
        }
      }
    }

    if (!pr) {
      throw new BadRequestException('تعذر إنشاء طلب الشراء. أعد المحاولة.');
    }

    await this.audit.log({
      userId: caller.id,
      action: submitOnCreate ? 'CREATE_AND_SUBMIT' : 'CREATE',
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

    const updateData: Prisma.PurchaseRequestUpdateInput = {
      ...(dto.nameAr && { nameAr: dto.nameAr }),
      ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.requirementType && { requirementType: dto.requirementType }),
      ...(dto.priority && { priority: dto.priority as any }),
      ...(dto.unit !== undefined && { unit: dto.unit }),
      ...(dto.quantity != null && { quantity: this.toDecimal(dto.quantity) }),
      ...(dto.totalAmount != null && { totalAmount: this.toDecimal(dto.totalAmount) }),
      ...(dto.vendor !== undefined && { vendor: dto.vendor }),
      ...(dto.expectedDeliveryDate && { expectedDeliveryDate: new Date(dto.expectedDeliveryDate) }),
      ...(dto.actualDeliveryDate && { actualDeliveryDate: new Date(dto.actualDeliveryDate) }),
      ...(dto.approvalNote !== undefined && { approvalNote: dto.approvalNote }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.activityId !== undefined && {
        activity: dto.activityId ? { connect: { id: dto.activityId } } : { disconnect: true },
      }),
    };

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: updateData,
      select: PR_DETAIL_SELECT,
    });

    await this.audit.log({
      userId: caller.id,
      action: 'UPDATE',
      module: 'procurement',
      entityType: 'PurchaseRequest',
      entityId: id,
      newData: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  // ─── Submit (DRAFT → PROCUREMENT_REVIEW) ──────────────────────────────────

  async submitRequest(id: string, dto: SubmitPRDto, caller: AuthUser) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: { id: true, projectId: true, status: true, currentStage: true, nameAr: true, requestedById: true },
    });
    if (!pr) throw new NotFoundException('طلب الشراء غير موجود');

    const projectIds = await this.scopedProjectIds(caller);
    if (projectIds !== 'all' && !projectIds.includes(pr.projectId)) {
      throw new ForbiddenException('لا تملك صلاحية الوصول إلى هذا الطلب');
    }

    if (pr.status !== 'DRAFT' || pr.currentStage !== 'DRAFT') {
      throw new BadRequestException(
        `لا يمكن تقديم الطلب لأنه ليس في حالة مسودة. الحالة الحالية: ${pr.status} / ${pr.currentStage}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.purchaseRequestApprovalStep.deleteMany({ where: { prId: id } });
      await tx.purchaseRequestApprovalStep.createMany({
        data: this.buildInitialApprovalSteps().map((step) => ({
          prId: id,
          stage: step.stage,
          status: step.status,
        })),
      });

      return tx.purchaseRequest.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          currentStage: 'PROCUREMENT_REVIEW',
          approvalNote: dto.note ?? null,
        },
        select: PR_DETAIL_SELECT,
      });
    });

    await this.audit.log({
      userId: caller.id,
      action: 'SUBMIT',
      module: 'procurement',
      entityType: 'PurchaseRequest',
      entityId: id,
    });

    return updated;
  }

  // ─── Approve stage ────────────────────────────────────────────────────────

  async approveStage(id: string, dto: ApproveRejectPRDto, caller: AuthUser) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: { id: true, projectId: true, status: true, currentStage: true, nameAr: true, requestedById: true },
    });
    if (!pr) throw new NotFoundException('طلب الشراء غير موجود');

    const projectIds = await this.scopedProjectIds(caller);
    if (projectIds !== 'all' && !projectIds.includes(pr.projectId)) {
      throw new ForbiddenException('لا تملك صلاحية الوصول إلى هذا الطلب');
    }

    const allowedRoles = STAGE_ROLES[pr.currentStage] ?? [];
    if (allowedRoles.length === 0) {
      throw new BadRequestException('لا توجد مرحلة اعتماد نشطة لهذا الطلب');
    }

    const callerRoles: string[] = caller.roles ?? [];
    if (!callerRoles.some((role) => allowedRoles.includes(role))) {
      throw new ForbiddenException('لا تملك الصلاحية لاعتماد هذه المرحلة');
    }

    if (caller.id === pr.requestedById) {
      throw new ForbiddenException('لا يمكنك اعتماد طلب الشراء الخاص بك');
    }

    const transition = STAGE_TRANSITIONS[pr.currentStage];
    if (!transition) {
      throw new BadRequestException('لا يمكن اعتماد هذا الطلب في مرحلته الحالية');
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const stepResult = await tx.purchaseRequestApprovalStep.updateMany({
        where: { prId: id, stage: pr.currentStage, status: 'PENDING' },
        data: { status: 'APPROVED', actorId: caller.id, note: dto.note ?? null, decidedAt: now },
      });

      if (stepResult.count === 0) {
        throw new BadRequestException('تمت معالجة هذه المرحلة بالفعل أو لا توجد خطوة معلقة');
      }

      const updateData: Prisma.PurchaseRequestUpdateInput = {
        status: transition.status,
        currentStage: transition.next,
      };

      if (transition.next === 'COMPLETED') {
        updateData.approvedBy = { connect: { id: caller.id } };
        updateData.approvedAt = now;
        updateData.approvalNote = dto.note ?? null;
      }

      return tx.purchaseRequest.update({
        where: { id },
        data: updateData,
        select: PR_DETAIL_SELECT,
      });
    });

    await this.audit.log({
      userId: caller.id,
      action: 'APPROVE_STAGE',
      module: 'procurement',
      entityType: 'PurchaseRequest',
      entityId: id,
      newData: { stage: pr.currentStage, nextStage: transition.next },
    });

    if (pr.requestedById && pr.requestedById !== caller.id) {
      const stageAr: Record<string, string> = {
        PROCUREMENT_REVIEW: 'مراجعة المشتريات',
        COST_REVIEW: 'مراجعة التكاليف',
        PM_REVIEW: 'اعتماد مدير المشروع',
        FINAL_REVIEW: 'الاعتماد النهائي',
      };
      const stageName = stageAr[pr.currentStage] ?? pr.currentStage;
      const title =
        transition.next === 'COMPLETED'
          ? 'تم الاعتماد النهائي على طلب الشراء'
          : `تم اعتماد مرحلة ${stageName} والطلب انتقل إلى المرحلة التالية`;
      await this.notifications.create({
        userId: pr.requestedById,
        title,
        body: pr.nameAr,
        type: transition.next === 'COMPLETED' ? 'SUCCESS' : 'INFO',
        entityType: 'purchase_request',
        entityId: id,
        route: '/procurement',
      });
    }

    return updated;
  }

  // ─── Reject stage ─────────────────────────────────────────────────────────

  async rejectStage(id: string, dto: ApproveRejectPRDto, caller: AuthUser) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: { id: true, projectId: true, status: true, currentStage: true, nameAr: true, requestedById: true },
    });
    if (!pr) throw new NotFoundException('طلب الشراء غير موجود');

    const projectIds = await this.scopedProjectIds(caller);
    if (projectIds !== 'all' && !projectIds.includes(pr.projectId)) {
      throw new ForbiddenException('لا تملك صلاحية الوصول إلى هذا الطلب');
    }

    const allowedRoles = STAGE_ROLES[pr.currentStage] ?? [];
    if (allowedRoles.length === 0) {
      throw new BadRequestException('لا توجد مرحلة اعتماد نشطة لهذا الطلب');
    }

    const callerRoles: string[] = caller.roles ?? [];
    if (!callerRoles.some((role) => allowedRoles.includes(role))) {
      throw new ForbiddenException('لا تملك الصلاحية لرفض هذه المرحلة');
    }

    if (!dto.note?.trim()) {
      throw new BadRequestException('سبب الرفض مطلوب قبل إكمال الإجراء');
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const stepResult = await tx.purchaseRequestApprovalStep.updateMany({
        where: { prId: id, stage: pr.currentStage, status: 'PENDING' },
        data: { status: 'REJECTED', actorId: caller.id, note: dto.note ?? null, decidedAt: now },
      });

      if (stepResult.count === 0) {
        throw new BadRequestException('تمت معالجة هذه المرحلة بالفعل أو لا توجد خطوة معلقة');
      }

      return tx.purchaseRequest.update({
        where: { id },
        data: { status: 'REJECTED', currentStage: 'REJECTED', approvalNote: dto.note ?? null },
        select: PR_DETAIL_SELECT,
      });
    });

    await this.audit.log({
      userId: caller.id,
      action: 'REJECT_STAGE',
      module: 'procurement',
      entityType: 'PurchaseRequest',
      entityId: id,
      newData: { stage: pr.currentStage, note: dto.note },
    });

    if (pr.requestedById && pr.requestedById !== caller.id) {
      await this.notifications.create({
        userId: pr.requestedById,
        title: 'تم رفض طلب الشراء',
        body: pr.nameAr,
        type: 'WARNING',
        entityType: 'purchase_request',
        entityId: id,
        route: '/procurement',
      });
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
