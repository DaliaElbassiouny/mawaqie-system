import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty() @IsString() value: string;
}

export class BulkUpdateSettingsDto {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  settings: Record<string, string>;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(module?: string) {
    return this.prisma.setting.findMany({
      where: module ? { module } : undefined,
      orderBy: { key: 'asc' },
    });
  }

  async findByModule(module: string) {
    const settings = await this.prisma.setting.findMany({ where: { module } });
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  async findByKey(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`إعداد '${key}' غير موجود`);
    return setting;
  }

  async update(key: string, value: string, actorId: string) {
    const old = await this.prisma.setting.findUnique({ where: { key } });

    const setting = await this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value, module: 'system' },
    });

    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      module: 'settings',
      entityType: 'Setting',
      entityId: key,
      oldData: old ? { value: old.value } : undefined,
      newData: { value },
    });

    return setting;
  }

  async bulkUpdate(settings: Record<string, string>, actorId: string) {
    const updated = await Promise.all(
      Object.entries(settings).map(([key, value]) => this.update(key, value, actorId)),
    );
    return updated;
  }

  async getSystemConfig() {
    const settings = await this.prisma.setting.findMany({ where: { module: 'system' } });
    return Object.fromEntries(settings.map((s) => [s.key.replace('system.', ''), s.value]));
  }
}
