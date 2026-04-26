import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, TenderStatus } from '@prisma/client';
import { AuthUser } from '@cdc/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTenderDto, UpdateTenderDto } from './dto/tender.dto';
import { sanitizePage, sanitizeLimit } from '../common/utils/query.util';

const TENDER_SELECT = {
  id: true,
  code: true,
  nameAr: true,
  nameEn: true,
  clientId: true,
  status: true,
  location: true,
  projectType: true,
  leadSource: true,
  currency: true,
  estimatedValue: true,
  submittedValue: true,
  bidReceiptDate: true,
  dueDate: true,
  submittedAt: true,
  awardedAt: true,
  bidResult: true,
  assignedEngineer: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  client: {
    select: { id: true, code: true, nameAr: true, nameEn: true },
  },
};

@Injectable()
export class TendersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: TenderStatus;
      location?: string;
      projectType?: string;
    },
    _caller: AuthUser,
  ) {
    const page = sanitizePage(query.page);
    const limit = sanitizeLimit(query.limit);

    const where: Prisma.TenderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.location ? { location: { contains: query.location } } : {}),
      ...(query.projectType ? { projectType: { contains: query.projectType } } : {}),
      ...(query.search
        ? {
            OR: [
              { nameAr: { contains: query.search } },
              { nameEn: { contains: query.search } },
              { code: { contains: query.search } },
              { assignedEngineer: { contains: query.search } },
              { client: { nameAr: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.tender.findMany({
        where,
        select: TENDER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tender.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStats(_caller: AuthUser) {
    const [statusCounts, valueSums] = await Promise.all([
      this.prisma.tender.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.tender.aggregate({
        _sum: { estimatedValue: true, submittedValue: true },
      }),
    ]);

    const byStatus: Record<string, number> = {
      PRICING_IN_PROGRESS: 0,
      PRICED_SUBMITTED: 0,
      CONTRACTED: 0,
      LOST: 0,
    };
    let total = 0;
    for (const row of statusCounts) {
      byStatus[row.status] = row._count._all;
      total += row._count._all;
    }

    return {
      total,
      byStatus,
      totalEstimatedValue: valueSums._sum.estimatedValue?.toString() ?? '0',
      totalSubmittedValue: valueSums._sum.submittedValue?.toString() ?? '0',
    };
  }

  async findById(id: string) {
    const tender = await this.prisma.tender.findUnique({ where: { id }, select: TENDER_SELECT });
    if (!tender) throw new NotFoundException('المناقصة غير موجودة');
    return tender;
  }

  async create(dto: CreateTenderDto, actorId: string) {
    const exists = await this.prisma.tender.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('كود المناقصة مستخدم مسبقاً');

    const clientExists = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!clientExists) throw new NotFoundException('العميل غير موجود');

    const { estimatedValue, submittedValue, bidReceiptDate, dueDate, submittedAt, awardedAt, ...rest } = dto;

    const tender = await this.prisma.tender.create({
      data: {
        ...rest,
        status: dto.status ?? TenderStatus.PRICING_IN_PROGRESS,
        ...(estimatedValue !== undefined ? { estimatedValue } : {}),
        ...(submittedValue !== undefined ? { submittedValue } : {}),
        ...(bidReceiptDate ? { bidReceiptDate: new Date(bidReceiptDate) } : {}),
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        ...(submittedAt ? { submittedAt: new Date(submittedAt) } : {}),
        ...(awardedAt ? { awardedAt: new Date(awardedAt) } : {}),
      },
      select: TENDER_SELECT,
    });

    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      module: 'tenders',
      entityType: 'Tender',
      entityId: tender.id,
      newData: { code: tender.code, nameAr: tender.nameAr, status: tender.status },
    });

    return tender;
  }

  async update(id: string, dto: UpdateTenderDto, actorId: string) {
    const tender = await this.prisma.tender.findUnique({ where: { id } });
    if (!tender) throw new NotFoundException('المناقصة غير موجودة');

    if (dto.code && dto.code !== tender.code) {
      const codeExists = await this.prisma.tender.findUnique({ where: { code: dto.code } });
      if (codeExists) throw new ConflictException('كود المناقصة مستخدم مسبقاً');
    }

    if (dto.clientId) {
      const clientExists = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!clientExists) throw new NotFoundException('العميل غير موجود');
    }

    const { estimatedValue, submittedValue, bidReceiptDate, dueDate, submittedAt, awardedAt, ...rest } = dto;

    const updated = await this.prisma.tender.update({
      where: { id },
      data: {
        ...rest,
        ...(estimatedValue !== undefined ? { estimatedValue } : {}),
        ...(submittedValue !== undefined ? { submittedValue } : {}),
        ...(bidReceiptDate !== undefined ? { bidReceiptDate: bidReceiptDate ? new Date(bidReceiptDate) : null } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(submittedAt !== undefined ? { submittedAt: submittedAt ? new Date(submittedAt) : null } : {}),
        ...(awardedAt !== undefined ? { awardedAt: awardedAt ? new Date(awardedAt) : null } : {}),
      },
      select: TENDER_SELECT,
    });

    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      module: 'tenders',
      entityType: 'Tender',
      entityId: id,
      oldData: { status: tender.status, nameAr: tender.nameAr },
      newData: { status: updated.status, nameAr: updated.nameAr },
    });

    return updated;
  }

  async remove(id: string, actorId: string) {
    const tender = await this.prisma.tender.findUnique({
      where: { id },
      include: { _count: { select: { projects: true } } },
    });
    if (!tender) throw new NotFoundException('المناقصة غير موجودة');

    if (tender._count.projects > 0) {
      throw new ConflictException('لا يمكن حذف المناقصة — لها مشاريع مرتبطة');
    }

    await this.prisma.tender.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: 'DELETE',
      module: 'tenders',
      entityType: 'Tender',
      entityId: id,
    });

    return { message: 'تم حذف المناقصة بنجاح' };
  }
}
