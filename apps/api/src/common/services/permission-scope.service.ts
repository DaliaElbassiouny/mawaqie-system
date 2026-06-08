import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '@mawaqie/shared';

// Roles that bypass per-record scoping and see the full dataset.
// Phase 2: extend this list when organisation-level roles are introduced.
const GLOBAL_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;
type GlobalRole = (typeof GLOBAL_ROLES)[number];

@Injectable()
export class PermissionScopeService {
  hasGlobalAccess(user: AuthUser): boolean {
    return user.roles.some((r) => GLOBAL_ROLES.includes(r as GlobalRole));
  }

  /**
   * Returns a Prisma WHERE clause scoped to what the calling user may see.
   *
   * SUPER_ADMIN / ADMIN  → unrestricted (empty where = all records)
   * All other roles       → own record only
   *
   * Phase 2 extension point: PROJECT_MANAGER scope to their project members
   * by querying UserRole.projectId and filtering here.
   */
  buildUserWhere(caller: AuthUser): Prisma.UserWhereInput {
    if (this.hasGlobalAccess(caller)) return {};
    return { id: caller.id };
  }

  /**
   * Project records are global for admins and scoped to assigned team members
   * for all other roles. UserRole.projectId is the project workspace boundary.
   */
  buildProjectWhere(caller: AuthUser): Prisma.ProjectWhereInput {
    if (this.hasGlobalAccess(caller)) return {};
    return { userRoles: { some: { userId: caller.id } } };
  }
}
