import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PERMISSIONS } from '@cdc/shared';
import { RbacService, CreateRoleDto, UpdateRoleDto, AssignRoleDto } from './rbac.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @RequirePermissions(PERMISSIONS.ROLES_VIEW)
  @ApiOperation({ summary: 'قائمة الأدوار' })
  findAllRoles() {
    return this.rbacService.findAllRoles();
  }

  @Get('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLES_VIEW)
  findRoleById(@Param('id') id: string) {
    return this.rbacService.findRoleById(id);
  }

  @Post('roles')
  @RequirePermissions(PERMISSIONS.ROLES_CREATE)
  @ApiOperation({ summary: 'إنشاء دور جديد' })
  createRole(@Body() dto: CreateRoleDto, @CurrentUser() user: { id: string }) {
    return this.rbacService.createRole(dto, user.id);
  }

  @Patch('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLES_UPDATE)
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.rbacService.updateRole(id, dto, user.id);
  }

  @Delete('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLES_DELETE)
  deleteRole(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.rbacService.deleteRole(id, user.id);
  }

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.ROLES_VIEW)
  @ApiOperation({ summary: 'قائمة الصلاحيات' })
  findAllPermissions() {
    return this.rbacService.findAllPermissions();
  }

  @Post('assign')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE_ROLES)
  @ApiOperation({ summary: 'تعيين دور لمستخدم' })
  assignRole(@Body() dto: AssignRoleDto, @CurrentUser() user: { id: string }) {
    return this.rbacService.assignRole(dto, user.id);
  }

  @Delete('revoke/:userId/:roleId')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE_ROLES)
  @ApiOperation({ summary: 'إلغاء دور من مستخدم' })
  revokeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.rbacService.revokeRole(userId, roleId, undefined, user.id);
  }
}
