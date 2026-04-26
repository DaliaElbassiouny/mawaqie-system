import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionScopeService } from '../common/services/permission-scope.service';
import { OperationsProcurementController } from './operations-procurement.controller';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [AuditModule],
  controllers: [OperationsController, OperationsProcurementController],
  providers: [OperationsService, PermissionScopeService],
})
export class OperationsModule {}
