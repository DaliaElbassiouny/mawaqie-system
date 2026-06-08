import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TenderStatus } from '@prisma/client';
import { AuthUser, PERMISSIONS } from '@mawaqie/shared';
import { TendersService } from './tenders.service';
import { CreateTenderDto, UpdateTenderDto } from './dto/tender.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { parseQueryNumber } from '../common/utils/query.util';

@ApiTags('Tenders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tenders')
export class TendersController {
  constructor(private readonly tendersService: TendersService) {}

  // stats must be declared before :id to avoid route conflict
  @Get('stats')
  @RequirePermissions(PERMISSIONS.TENDERS_VIEW)
  @ApiOperation({ summary: 'إحصائيات المناقصات' })
  getStats(@CurrentUser() caller: AuthUser) {
    return this.tendersService.getStats(caller);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.TENDERS_VIEW)
  @ApiOperation({ summary: 'سجل المناقصات' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TenderStatus })
  @ApiQuery({ name: 'location', required: false })
  @ApiQuery({ name: 'projectType', required: false })
  findAll(
    @CurrentUser() caller: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('location') location?: string,
    @Query('projectType') projectType?: string,
  ) {
    return this.tendersService.findAll(
      {
        page: parseQueryNumber(page),
        limit: parseQueryNumber(limit),
        search,
        status: status as TenderStatus | undefined,
        location,
        projectType,
      },
      caller,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.TENDERS_VIEW)
  @ApiOperation({ summary: 'تفاصيل مناقصة' })
  findById(@Param('id') id: string) {
    return this.tendersService.findById(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.TENDERS_CREATE)
  @ApiOperation({ summary: 'إضافة مناقصة جديدة' })
  create(@Body() dto: CreateTenderDto, @CurrentUser() user: AuthUser) {
    return this.tendersService.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.TENDERS_UPDATE)
  @ApiOperation({ summary: 'تعديل مناقصة' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tendersService.update(id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.TENDERS_DELETE)
  @ApiOperation({ summary: 'حذف مناقصة' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tendersService.remove(id, user.id);
  }
}
