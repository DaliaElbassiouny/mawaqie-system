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
import { AuthUser, PERMISSIONS } from '@cdc/shared';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { parseQueryNumber, parseQueryBoolean } from '../common/utils/query.util';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CLIENTS_VIEW)
  @ApiOperation({ summary: 'قائمة العملاء' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, description: 'true | false' })
  findAll(
    @CurrentUser() caller: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.clientsService.findAll(
      {
        page: parseQueryNumber(page),
        limit: parseQueryNumber(limit),
        search,
        isActive: parseQueryBoolean(isActive),
      },
      caller,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CLIENTS_VIEW)
  @ApiOperation({ summary: 'تفاصيل عميل' })
  findById(@Param('id') id: string) {
    return this.clientsService.findById(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CLIENTS_CREATE)
  @ApiOperation({ summary: 'إنشاء عميل جديد' })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthUser) {
    return this.clientsService.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CLIENTS_UPDATE)
  @ApiOperation({ summary: 'تعديل بيانات عميل' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clientsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.CLIENTS_DELETE)
  @ApiOperation({ summary: 'حذف / تعطيل عميل' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.clientsService.remove(id, user.id);
  }
}
