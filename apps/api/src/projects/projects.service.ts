import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectSourceType, ProjectStatus, TenderStatus } from '@prisma/client';
import { AuthUser } from '@cdc/shared';
import { sanitizePage, sanitizeLimit } from '../common/utils/query.util';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PermissionScopeService } from '../common/services/permission-scope.service';
import {
  AssignProjectTeamDto,
  CreateProjectDto,
  ProjectTeamMemberDto,
  UpdateProjectDto,
} from './dto/project.dto';

const PROJECT_TEAM_SELECT = {
  id: true,
  userId: true,
  roleId: true,
  createdAt: true,
  user: { select: { id: true, email: true, nameAr: true, nameEn: true } },
  role: { select: { id: true, code: true, nameAr: true, nameEn: true } },
};

const PROJECT_SELECT = {
  id: true,
  code: true,
  nameAr: true,
  nameEn: true,
  tenderId: true,
  sourceType: true,
  companyCode: true,
  location: true,
  projectType: true,
  currency: true,
  status: true,
  startDate: true,
  endDate: true,
  contractValue: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  tender: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      nameEn: true,
      status: true,
      client: { select: { id: true, code: true, nameAr: true, nameEn: true } },
    },
  },
  userRoles: {
    select: PROJECT_TEAM_SELECT,
    orderBy: { createdAt: 'asc' as const },
  },
  _count: {
    select: { userRoles: true, costItems: true, purchaseRequests: true },
  },
};


const parseOptionalDate = (value: string | undefined) =>
  value ? new Date(value) : undefined;

const defaultProjectCode = (tenderCode: string) =>
  tenderCode.startsWith('TND-')
    ? tenderCode.replace(/^TND-/, 'PRJ-')
    : `PRJ-${tenderCode}`;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly permissionScope: PermissionScopeService,
  ) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: ProjectStatus;
    },
    caller: AuthUser,
  ) {
    const page = sanitizePage(query.page);
    const limit = sanitizeLimit(query.limit);
    const whereParts: Prisma.ProjectWhereInput[] = [
      this.permissionScope.buildProjectWhere(caller),
    ];

    if (query.status) {
      whereParts.push({ status: query.status });
    }

    if (query.search) {
      whereParts.push({
        OR: [
          { code: { contains: query.search } },
          { nameAr: { contains: query.search } },
          { nameEn: { contains: query.search } },
          { companyCode: { contains: query.search } },
          { location: { contains: query.search } },
          { projectType: { contains: query.search } },
          { tender: { code: { contains: query.search } } },
          { tender: { client: { nameAr: { contains: query.search } } } },
        ],
      });
    }

    const where: Prisma.ProjectWhereInput = { AND: whereParts };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        select: PROJECT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, caller: AuthUser) {
    const project = await this.prisma.project.findFirst({
      where: { AND: [{ id }, this.permissionScope.buildProjectWhere(caller)] },
      select: PROJECT_SELECT,
    });

    if (!project) throw new NotFoundException('المشروع غير موجود');
    return project;
  }

  async create(dto: CreateProjectDto, actor: AuthUser) {
    const sourceType = dto.sourceType;
    let tender:
      | {
          id: string;
          code: string;
          nameAr: string;
          nameEn: string | null;
          status: TenderStatus;
          location: string | null;
          projectType: string | null;
          currency: string;
          estimatedValue: Prisma.Decimal | null;
          submittedValue: Prisma.Decimal | null;
          awardedAt: Date | null;
        }
      | null = null;

    if (sourceType === ProjectSourceType.TENDER) {
      if (!dto.tenderId) throw new BadRequestException('اختر المناقصة أولاً');

      tender = await this.prisma.tender.findUnique({
      where: { id: dto.tenderId },
      select: {
        id: true,
        code: true,
        nameAr: true,
        nameEn: true,
        status: true,
        location: true,
        projectType: true,
        currency: true,
        estimatedValue: true,
        submittedValue: true,
        awardedAt: true,
      },
    });

    if (!tender) throw new NotFoundException('المناقصة غير موجودة');
    if (tender.status !== TenderStatus.CONTRACTED) {
      throw new BadRequestException('يمكن إنشاء مشروع فقط من مناقصة متعاقدة / راسية');
    }

    const existingTenderProject = await this.prisma.project.findFirst({
      where: { tenderId: tender.id },
      select: { id: true },
    });
    if (existingTenderProject) {
      throw new ConflictException('تم إنشاء مشروع لهذه المناقصة مسبقاً');
    }

    }

    const code = dto.code ?? (tender ? defaultProjectCode(tender.code) : undefined);
    if (!code) throw new BadRequestException('كود المشروع مطلوب عند إنشاء مشروع مباشر');

    const nameAr = dto.nameAr ?? tender?.nameAr;
    if (!nameAr) throw new BadRequestException('اسم المشروع مطلوب عند إنشاء مشروع مباشر');
    const existingCode = await this.prisma.project.findUnique({ where: { code } });
    if (existingCode) throw new ConflictException('كود المشروع مستخدم مسبقاً');

    const teamMembers = await this.validateTeamMembers(this.prisma, dto.teamMembers ?? []);

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          code,
          sourceType,
          nameAr,
          nameEn: dto.nameEn ?? tender?.nameEn,
          companyCode: dto.companyCode,
          location: dto.location ?? tender?.location,
          projectType: dto.projectType ?? tender?.projectType,
          currency: dto.currency ?? tender?.currency ?? 'SAR',
          status: dto.status ?? ProjectStatus.PLANNING,
          contractValue: dto.contractValue ?? tender?.submittedValue ?? tender?.estimatedValue,
          startDate: parseOptionalDate(dto.startDate) ?? tender?.awardedAt ?? undefined,
          endDate: parseOptionalDate(dto.endDate),
          notes: dto.notes,
          ...(tender ? { tender: { connect: { id: tender.id } } } : {}),
        },
      });

      await this.replaceTeamMembers(tx, created.id, teamMembers);

      return tx.project.findUniqueOrThrow({
        where: { id: created.id },
        select: PROJECT_SELECT,
      });
    });

    await this.audit.log({
      userId: actor.id,
      action: 'CREATE',
      module: 'projects',
      entityType: 'Project',
      entityId: project.id,
      newData: {
        code: project.code,
        sourceType: project.sourceType,
        tenderId: tender?.id ?? null,
        status: project.status,
      },
    });

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, actor: AuthUser) {
    const current = await this.prisma.project.findFirst({
      where: { AND: [{ id }, this.permissionScope.buildProjectWhere(actor)] },
    });
    if (!current) throw new NotFoundException('المشروع غير موجود');

    if (dto.code && dto.code !== current.code) {
      const codeExists = await this.prisma.project.findUnique({ where: { code: dto.code } });
      if (codeExists) throw new ConflictException('كود المشروع مستخدم مسبقاً');
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.nameAr !== undefined ? { nameAr: dto.nameAr } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn || null } : {}),
        ...(dto.companyCode !== undefined ? { companyCode: dto.companyCode || null } : {}),
        ...(dto.location !== undefined ? { location: dto.location || null } : {}),
        ...(dto.projectType !== undefined ? { projectType: dto.projectType || null } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency || 'SAR' } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.contractValue !== undefined ? { contractValue: dto.contractValue } : {}),
        ...(dto.startDate !== undefined
          ? { startDate: dto.startDate ? new Date(dto.startDate) : null }
          : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
      },
      select: PROJECT_SELECT,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'UPDATE',
      module: 'projects',
      entityType: 'Project',
      entityId: id,
      oldData: { status: current.status, contractValue: current.contractValue },
      newData: { status: updated.status, contractValue: updated.contractValue },
    });

    return updated;
  }

  async assignTeam(id: string, dto: AssignProjectTeamDto, actor: AuthUser) {
    await this.findById(id, actor);
    const teamMembers = await this.validateTeamMembers(this.prisma, dto.members);

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.replaceTeamMembers(tx, id, teamMembers);
      return tx.project.findUniqueOrThrow({ where: { id }, select: PROJECT_SELECT });
    });

    await this.audit.log({
      userId: actor.id,
      action: 'ASSIGN_TEAM',
      module: 'projects',
      entityType: 'Project',
      entityId: id,
      newData: {
        members: teamMembers.map((member) => ({
          userId: member.userId,
          roleId: member.roleId,
        })),
      },
    });

    return updated;
  }

  async remove(id: string, actor: AuthUser) {
    const project = await this.prisma.project.findFirst({
      where: { AND: [{ id }, this.permissionScope.buildProjectWhere(actor)] },
      include: { _count: { select: { costItems: true, purchaseRequests: true } } },
    });
    if (!project) throw new NotFoundException('المشروع غير موجود');

    if (project._count.costItems > 0 || project._count.purchaseRequests > 0) {
      throw new ConflictException('لا يمكن حذف مشروع له بيانات تشغيلية مرتبطة');
    }

    await this.prisma.project.delete({ where: { id } });
    await this.audit.log({
      userId: actor.id,
      action: 'DELETE',
      module: 'projects',
      entityType: 'Project',
      entityId: id,
    });

    return { message: 'تم حذف المشروع بنجاح' };
  }

  private async validateTeamMembers(
    client: Prisma.TransactionClient | PrismaService,
    members: ProjectTeamMemberDto[],
  ) {
    const uniqueMembers = [
      ...new Map(members.map((member) => [`${member.userId}:${member.roleId}`, member])).values(),
    ];
    if (uniqueMembers.length === 0) return [];

    const userIds = [...new Set(uniqueMembers.map((member) => member.userId))];
    const roleIds = [...new Set(uniqueMembers.map((member) => member.roleId))];

    const [users, roles] = await Promise.all([
      client.user.findMany({ where: { id: { in: userIds }, isActive: true }, select: { id: true } }),
      client.role.findMany({ where: { id: { in: roleIds } }, select: { id: true } }),
    ]);

    if (users.length !== userIds.length) {
      throw new NotFoundException('أحد أعضاء الفريق غير موجود أو غير نشط');
    }
    if (roles.length !== roleIds.length) {
      throw new NotFoundException('أحد أدوار الفريق غير موجود');
    }

    return uniqueMembers;
  }

  private async replaceTeamMembers(
    tx: Prisma.TransactionClient,
    projectId: string,
    members: ProjectTeamMemberDto[],
  ) {
    await tx.userRole.deleteMany({ where: { projectId } });
    if (members.length === 0) return;

    await tx.userRole.createMany({
      data: members.map((member) => ({
        projectId,
        userId: member.userId,
        roleId: member.roleId,
      })),
      skipDuplicates: true,
    });
  }
}
