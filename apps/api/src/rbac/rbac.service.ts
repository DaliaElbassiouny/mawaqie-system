import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty() @IsString() nameAr: string;
  @ApiProperty() @IsString() nameEn: string;
  @ApiProperty() @IsString() code: string;
  @ApiProperty({ required: false }) @IsOptional() @IsArray() permissionIds?: string[];
}

export class UpdateRoleDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() nameAr?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() nameEn?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsArray() permissionIds?: string[];
}

export class AssignRoleDto {
  @ApiProperty() @IsString() userId: string;
  @ApiProperty() @IsString() roleId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() projectId?: string;
}

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAllRoles() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findRoleById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: { include: { permission: true } },
      },
    });
    if (!role) throw new NotFoundException('الدور غير موجود');
    return role;
  }

  async createRole(dto: CreateRoleDto, actorId: string) {
    const code = dto.code.toUpperCase();
    const exists = await this.prisma.role.findUnique({ where: { code } });
    if (exists) throw new ConflictException('كود الدور مستخدم مسبقاً');

    const role = await this.prisma.role.create({
      data: {
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        code,
        isSystem: false,
        ...(dto.permissionIds && {
          rolePermissions: {
            createMany: {
              data: dto.permissionIds.map((id) => ({ permissionId: id })),
              skipDuplicates: true,
            },
          },
        }),
      },
    });

    await this.audit.log({ userId: actorId, action: 'CREATE', module: 'roles', entityType: 'Role', entityId: role.id, newData: { code: role.code } });

    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('الدور غير موجود');
    if (role.isSystem) throw new BadRequestException('لا يمكن تعديل الأدوار الأساسية للنظام');

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.nameAr && { nameAr: dto.nameAr }),
        ...(dto.nameEn && { nameEn: dto.nameEn }),
      },
    });

    if (dto.permissionIds !== undefined) {
      await this.prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (dto.permissionIds && dto.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: dto.permissionIds.map((pid) => ({ roleId: id, permissionId: pid })),
            skipDuplicates: true,
          });
        }
      });
    }

    await this.audit.log({ userId: actorId, action: 'UPDATE', module: 'roles', entityType: 'Role', entityId: id });

    return updated;
  }

  async deleteRole(id: string, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('الدور غير موجود');
    if (role.isSystem) throw new BadRequestException('لا يمكن حذف الأدوار الأساسية للنظام');

    await this.prisma.role.delete({ where: { id } });
    await this.audit.log({ userId: actorId, action: 'DELETE', module: 'roles', entityType: 'Role', entityId: id });

    return { message: 'تم الحذف بنجاح' };
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
  }

  async assignRole(dto: AssignRoleDto, actorId: string) {
    const existing = await this.prisma.userRole.findFirst({
      where: { userId: dto.userId, roleId: dto.roleId, projectId: dto.projectId ?? null },
    });
    const userRole = existing ?? await this.prisma.userRole.create({
      data: { userId: dto.userId, roleId: dto.roleId, projectId: dto.projectId ?? null },
    });

    await this.audit.log({
      userId: actorId,
      action: 'ASSIGN_ROLE',
      module: 'users',
      entityType: 'User',
      entityId: dto.userId,
      newData: { roleId: dto.roleId, projectId: dto.projectId },
    });

    return userRole;
  }

  async revokeRole(userId: string, roleId: string, projectId: string | undefined, actorId: string) {
    await this.prisma.userRole.deleteMany({
      where: { userId, roleId, projectId: projectId ?? null },
    });

    await this.audit.log({
      userId: actorId,
      action: 'REVOKE_ROLE',
      module: 'users',
      entityType: 'User',
      entityId: userId,
      newData: { roleId, projectId },
    });

    return { message: 'تم إلغاء الدور' };
  }
}
