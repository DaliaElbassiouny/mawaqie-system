import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuditModule } from '../audit/audit.module';
import { PermissionScopeService } from '../common/services/permission-scope.service';

@Module({
  imports: [AuditModule],
  controllers: [UsersController],
  providers: [UsersService, PermissionScopeService],
  exports: [UsersService],
})
export class UsersModule {}
