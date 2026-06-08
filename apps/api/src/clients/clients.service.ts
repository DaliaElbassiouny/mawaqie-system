import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '@mawaqie/shared';
import { sanitizePage, sanitizeLimit } from '../common/utils/query.util';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

const CLIENT_SELECT = {
  id: true,
  nameAr: true,
  nameEn: true,
  code: true,
  phone: true,
  email: true,
  address: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};


@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    query: { page?: number; limit?: number; search?: string; isActive?: boolean },
    _caller: AuthUser,
  ) {
    const page = sanitizePage(query.page);
    const limit = sanitizeLimit(query.limit);

    const where: Prisma.ClientWhereInput = {
      ...(query.search
        ? {
            OR: [
              { nameAr: { contains: query.search } },
              { nameEn: { contains: query.search } },
              { code: { contains: query.search } },
              { email: { contains: query.search } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        select: CLIENT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      select: CLIENT_SELECT,
    });
    if (!client) throw new NotFoundException('العميل غير موجود');
    return client;
  }

  async create(dto: CreateClientDto, actorId: string) {
    const exists = await this.prisma.client.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('كود العميل مستخدم مسبقاً');

    const client = await this.prisma.client.create({
      data: { ...dto },
      select: CLIENT_SELECT,
    });

    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      module: 'clients',
      entityType: 'Client',
      entityId: client.id,
      newData: { code: client.code, nameAr: client.nameAr },
    });

    return client;
  }

  async update(id: string, dto: UpdateClientDto, actorId: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('العميل غير موجود');

    if (dto.code && dto.code !== client.code) {
      const codeExists = await this.prisma.client.findUnique({ where: { code: dto.code } });
      if (codeExists) throw new ConflictException('كود العميل مستخدم مسبقاً');
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: dto,
      select: CLIENT_SELECT,
    });

    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      module: 'clients',
      entityType: 'Client',
      entityId: id,
      oldData: { nameAr: client.nameAr, isActive: client.isActive },
      newData: { nameAr: updated.nameAr, isActive: updated.isActive },
    });

    return updated;
  }

  async remove(id: string, actorId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { tenders: true } } },
    });
    if (!client) throw new NotFoundException('العميل غير موجود');

    if (client._count.tenders > 0) {
      // Soft-delete when tenders exist — preserve referential integrity
      await this.prisma.client.update({ where: { id }, data: { isActive: false } });
      await this.audit.log({
        userId: actorId,
        action: 'DEACTIVATE',
        module: 'clients',
        entityType: 'Client',
        entityId: id,
        newData: { reason: 'has_tenders' },
      });
      return { message: 'تم تعطيل العميل (له مناقصات مرتبطة)' };
    }

    await this.prisma.client.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: 'DELETE',
      module: 'clients',
      entityType: 'Client',
      entityId: id,
    });

    return { message: 'تم حذف العميل بنجاح' };
  }
}
