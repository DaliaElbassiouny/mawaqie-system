// ─── Permission Codes ─────────────────────────────────────────────────────────
// Format: MODULE:ACTION

export const PERMISSIONS = {
  // Users
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_ROLES: 'users:manage_roles',

  // Roles
  ROLES_VIEW: 'roles:view',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',

  // Clients
  CLIENTS_VIEW: 'clients:view',
  CLIENTS_CREATE: 'clients:create',
  CLIENTS_UPDATE: 'clients:update',
  CLIENTS_DELETE: 'clients:delete',

  // Tenders
  TENDERS_VIEW: 'tenders:view',
  TENDERS_CREATE: 'tenders:create',
  TENDERS_UPDATE: 'tenders:update',
  TENDERS_DELETE: 'tenders:delete',

  // Projects
  PROJECTS_VIEW: 'projects:view',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',

  // Cost Control (scaffold)
  COST_VIEW: 'cost:view',
  COST_CREATE: 'cost:create',
  COST_UPDATE: 'cost:update',
  COST_APPROVE: 'cost:approve',

  // Procurement (scaffold)
  PROCUREMENT_VIEW: 'procurement:view',
  PROCUREMENT_CREATE: 'procurement:create',
  PROCUREMENT_UPDATE: 'procurement:update',
  PROCUREMENT_APPROVE: 'procurement:approve',

  // Operations
  OPERATIONS_VIEW: 'operations:view',
  OPERATIONS_CREATE: 'operations:create',
  OPERATIONS_UPDATE: 'operations:update',
  OPERATIONS_DELETE: 'operations:delete',
  OPERATIONS_APPROVE: 'operations:approve',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // Documents / Attachments
  DOCUMENTS_VIEW: 'documents:view',
  DOCUMENTS_CREATE: 'documents:create',
  DOCUMENTS_DELETE: 'documents:delete',

  // Notifications
  NOTIFICATIONS_VIEW: 'notifications:view',

  // Audit
  AUDIT_VIEW: 'audit:view',

  // Imports (future)
  IMPORTS_VIEW: 'imports:view',
  IMPORTS_RUN: 'imports:run',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── System Roles ─────────────────────────────────────────────────────────────

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  COST_CONTROLLER: 'COST_CONTROLLER',
  PROCUREMENT_OFFICER: 'PROCUREMENT_OFFICER',
  VIEWER: 'VIEWER',
} as const;

// ─── Supported Currencies ─────────────────────────────────────────────────────

export const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'QAR', 'BHD'] as const;
export type Currency = (typeof CURRENCIES)[number];

// ─── Pagination Defaults ──────────────────────────────────────────────────────

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 200;

// ─── Audit Modules ────────────────────────────────────────────────────────────

export const AUDIT_MODULES = {
  AUTH: 'auth',
  USERS: 'users',
  ROLES: 'roles',
  CLIENTS: 'clients',
  TENDERS: 'tenders',
  PROJECTS: 'projects',
  COST: 'cost',
  PROCUREMENT: 'procurement',
  OPERATIONS: 'operations',
  DOCUMENTS: 'documents',
  NOTIFICATIONS: 'notifications',
  SETTINGS: 'settings',
  IMPORTS: 'imports',
} as const;
