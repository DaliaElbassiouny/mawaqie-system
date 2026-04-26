import { Module } from '@nestjs/common';
import { PermissionScopeService } from '../common/services/permission-scope.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PermissionScopeService],
})
export class ReportsModule {}
