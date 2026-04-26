import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionScopeService } from '../common/services/permission-scope.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [AuditModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, PermissionScopeService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
