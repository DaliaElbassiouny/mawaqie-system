import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionScopeService } from '../common/services/permission-scope.service';
import { CostController } from './cost.controller';
import { CostService } from './cost.service';

@Module({
  imports: [AuditModule],
  controllers: [CostController],
  providers: [CostService, PermissionScopeService],
})
export class CostModule {}
