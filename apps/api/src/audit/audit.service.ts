import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogDto {
  userId?: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: dto.userId,
        action: dto.action,
        module: dto.module,
        entityType: dto.entityType,
        entityId: dto.entityId,
        oldData: dto.oldData as never,
        newData: dto.newData as never,
        ip: dto.ip,
        userAgent: dto.userAgent,
      },
    });
  }

  async findAll(query: { module?: string; userId?: string; page?: number; limit?: number }) {
    const { module, userId, page = 1, limit = 25 } = query;
    const where = {
      ...(module && { module }),
      ...(userId && { userId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { nameAr: true, nameEn: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
