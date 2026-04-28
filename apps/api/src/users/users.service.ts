import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { AuthUser } from '@cdc/shared';
import { sanitizePage, sanitizeLimit } from '../common/utils/query.util';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PermissionScopeService } from '../common/services/permission-scope.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

const USER_SELECT = {
  id: true,
  email: true,
  nameAr: true,
  nameEn: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  userRoles: {
    include: {
      role: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      project: { select: { id: true, code: true, nameAr: true } },
    },
  },
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly permissionScope: PermissionScopeService,
  ) {}

  async findAll(
    query: { page?: number; limit?: number; search?: string },
    caller: AuthUser,
  ) {
    const page = sanitizePage(query.page);
    const limit = sanitizeLimit(query.limit);
    const { search } = query;

    const scopeWhere = this.permissionScope.buildUserWhere(caller);
    const searchWhere: Prisma.UserWhereInput = search
      ? {
          OR: [
            { nameAr: { contains: search } },
            { nameEn: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const where: Prisma.UserWhereInput = { ...scopeWhere, ...searchWhere };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, caller: AuthUser) {
    const scopeWhere = this.permissionScope.buildUserWhere(caller);
    // findFirst lets us AND the id with the scope filter in one query.
    // A non-admin asking for another user's id will get null → 404.
    const user = await this.prisma.user.findFirst({
      where: { id, ...scopeWhere },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    return user;
  }

  async create(dto: CreateUserDto, actorId: string) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('البريد الإلكتروني مسجل مسبقاً');

    const password = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { ...dto, password },
      select: USER_SELECT,
    });

    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      module: 'users',
      entityType: 'User',
      entityId: user.id,
      newData: { email: user.email },
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });

    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      module: 'users',
      entityType: 'User',
      entityId: id,
    });

    return updated;
  }

  async deactivate(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    await this.audit.log({
      userId: actorId,
      action: 'DEACTIVATE',
      module: 'users',
      entityType: 'User',
      entityId: id,
    });

    return { message: 'تم تعطيل الحساب' };
  }
}
