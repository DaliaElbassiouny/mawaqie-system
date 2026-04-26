import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import { AuthUser, PERMISSIONS } from '@cdc/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/roles.decorator';
import { AssignProjectTeamDto, CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';
import { parseQueryNumber } from '../common/utils/query.util';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECTS_VIEW)
  @ApiOperation({ summary: 'قائمة المشاريع' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  findAll(
    @CurrentUser() caller: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.projectsService.findAll(
      {
        page: parseQueryNumber(page),
        limit: parseQueryNumber(limit),
        search,
        status: status as ProjectStatus | undefined,
      },
      caller,
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS_VIEW)
  @ApiOperation({ summary: 'تفاصيل المشروع' })
  findById(@Param('id') id: string, @CurrentUser() caller: AuthUser) {
    return this.projectsService.findById(id, caller);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECTS_CREATE)
  @ApiOperation({ summary: 'إنشاء مشروع' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS_UPDATE)
  @ApiOperation({ summary: 'تعديل بيانات المشروع الأساسية' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.update(id, dto, user);
  }

  @Patch(':id/team')
  @RequirePermissions(PERMISSIONS.PROJECTS_UPDATE)
  @ApiOperation({ summary: 'تحديث فريق المشروع' })
  assignTeam(
    @Param('id') id: string,
    @Body() dto: AssignProjectTeamDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.assignTeam(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS_DELETE)
  @ApiOperation({ summary: 'حذف مشروع' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.remove(id, user);
  }
}
