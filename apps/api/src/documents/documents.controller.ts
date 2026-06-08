import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '@mawaqie/shared';
import { DocumentsService, UPLOADS_ROOT } from './documents.service';
import { ListDocumentsQueryDto } from './dto/document.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents (filter by entityType + entityId)' })
  list(@Query() query: ListDocumentsQueryDto, @CurrentUser() caller: AuthUser) {
    return this.service.list(query, caller);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
          const entityType = (req.body as Record<string, string>).entityType ?? 'general';
          const entityId = (req.body as Record<string, string>).entityId ?? 'misc';
          const dir = path.join(UPLOADS_ROOT, entityType, entityId);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
          const ext = extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
    @CurrentUser() caller: AuthUser,
  ) {
    if (!file) throw new BadRequestException('لم يتم إرسال ملف');
    if (!body.entityType || !body.entityId) throw new BadRequestException('entityType و entityId مطلوبان');

    return this.service.upload(file, body.entityType, body.entityId, caller, {
      title: body.title,
      description: body.description,
      category: body.category,
    });
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a document by ID' })
  async download(
    @Param('id') id: string,
    @CurrentUser() caller: AuthUser,
    @Res() res: Response,
  ) {
    const { doc, fullPath } = await this.service.getDownloadInfo(id, caller);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
    res.setHeader('Content-Type', doc.mimeType);
    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  deleteDocument(@Param('id') id: string, @CurrentUser() caller: AuthUser) {
    return this.service.deleteDocument(id, caller);
  }
}
