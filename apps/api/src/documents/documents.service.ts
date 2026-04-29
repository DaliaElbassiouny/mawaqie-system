import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '@cdc/shared';
import { ListDocumentsQueryDto } from './dto/document.dto';

interface MulterFile {
  path: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
]);

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const DOC_SELECT = {
  id: true,
  entityType: true,
  entityId: true,
  fileName: true,
  originalName: true,
  mimeType: true,
  size: true,
  category: true,
  title: true,
  description: true,
  storagePath: true,
  createdAt: true,
  uploadedBy: { select: { id: true, nameAr: true } },
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async upload(
    file: MulterFile,
    entityType: string,
    entityId: string,
    caller: AuthUser,
    options?: { title?: string; description?: string; category?: string },
  ) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('نوع الملف غير مدعوم');
    }
    if (file.size > MAX_SIZE_BYTES) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('حجم الملف يتجاوز 20 ميغابايت');
    }

    const storagePath = path.relative(UPLOADS_ROOT, file.path).replace(/\\/g, '/');

    const doc = await this.prisma.document.create({
      data: {
        entityType,
        entityId,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        category: options?.category ?? 'general',
        title: options?.title ?? null,
        description: options?.description ?? null,
        uploadedById: caller.id,
        storagePath,
      },
      select: DOC_SELECT,
    });

    await this.audit.log({
      userId: caller.id,
      action: 'CREATE',
      module: 'documents',
      entityType: 'Document',
      entityId: doc.id,
      newData: { entityType, entityId, fileName: file.originalname } as Record<string, unknown>,
    });

    // Notify relevant users about document upload
    await this.notifications.create({
      userId: caller.id,
      title: 'تم رفع مستند جديد',
      body: options?.title ?? file.originalname,
      type: 'SUCCESS',
      entityType,
      entityId,
      route: entityType === 'purchase_request' ? `/procurement` : `/projects/${entityId}`,
    });

    return doc;
  }

  async list(query: ListDocumentsQueryDto, caller: AuthUser) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where = {
      ...(query.entityType && { entityType: query.entityType }),
      ...(query.entityId && { entityId: query.entityId }),
      ...(query.category && { category: query.category }),
    };

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        select: DOC_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDownloadInfo(id: string, caller: AuthUser) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      select: { ...DOC_SELECT, storagePath: true, fileName: true, originalName: true, mimeType: true },
    });
    if (!doc) throw new NotFoundException('المستند غير موجود');

    const fullPath = path.join(UPLOADS_ROOT, doc.storagePath);
    if (!fs.existsSync(fullPath)) throw new NotFoundException('ملف المستند غير موجود على الخادم');

    return { doc, fullPath };
  }

  async deleteDocument(id: string, caller: AuthUser) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      select: { id: true, uploadedById: true, storagePath: true, entityType: true, entityId: true },
    });
    if (!doc) throw new NotFoundException('المستند غير موجود');

    if (doc.uploadedById !== caller.id) {
      throw new ForbiddenException('لا يمكنك حذف مستند لم ترفعه');
    }

    const fullPath = path.join(UPLOADS_ROOT, doc.storagePath);
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch { /* ignore if already gone */ }
    }

    await this.prisma.document.delete({ where: { id } });

    await this.audit.log({
      userId: caller.id,
      action: 'DELETE',
      module: 'documents',
      entityType: 'Document',
      entityId: id,
    });

    return { success: true };
  }
}
