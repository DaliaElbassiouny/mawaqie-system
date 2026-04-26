import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionScopeService } from '../common/services/permission-scope.service';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [ProcurementController],
  providers: [ProcurementService, PermissionScopeService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
