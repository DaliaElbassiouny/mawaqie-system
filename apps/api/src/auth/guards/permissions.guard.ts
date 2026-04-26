import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions && !requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('غير مصرح');

    // Super admin bypasses all permission checks
    if ((user.roles as string[]).includes('SUPER_ADMIN')) return true;

    if (requiredRoles) {
      const hasRole = requiredRoles.some((r) => (user.roles as string[]).includes(r));
      if (!hasRole) throw new ForbiddenException('لا تملك صلاحية الوصول لهذه الصفحة');
    }

    if (requiredPermissions) {
      const hasPermission = requiredPermissions.every((p) =>
        (user.permissions as string[]).includes(p),
      );
      if (!hasPermission) throw new ForbiddenException('لا تملك صلاحية تنفيذ هذا الإجراء');
    }

    return true;
  }
}
