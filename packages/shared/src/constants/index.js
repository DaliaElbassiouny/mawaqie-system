"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIT_MODULES = exports.MAX_LIMIT = exports.DEFAULT_LIMIT = exports.DEFAULT_PAGE = exports.CURRENCIES = exports.SYSTEM_ROLES = exports.PERMISSIONS = void 0;
exports.PERMISSIONS = {
    USERS_VIEW: 'users:view',
    USERS_CREATE: 'users:create',
    USERS_UPDATE: 'users:update',
    USERS_DELETE: 'users:delete',
    USERS_MANAGE_ROLES: 'users:manage_roles',
    ROLES_VIEW: 'roles:view',
    ROLES_CREATE: 'roles:create',
    ROLES_UPDATE: 'roles:update',
    ROLES_DELETE: 'roles:delete',
    CLIENTS_VIEW: 'clients:view',
    CLIENTS_CREATE: 'clients:create',
    CLIENTS_UPDATE: 'clients:update',
    CLIENTS_DELETE: 'clients:delete',
    TENDERS_VIEW: 'tenders:view',
    TENDERS_CREATE: 'tenders:create',
    TENDERS_UPDATE: 'tenders:update',
    TENDERS_DELETE: 'tenders:delete',
    PROJECTS_VIEW: 'projects:view',
    PROJECTS_CREATE: 'projects:create',
    PROJECTS_UPDATE: 'projects:update',
    PROJECTS_DELETE: 'projects:delete',
    COST_VIEW: 'cost:view',
    COST_CREATE: 'cost:create',
    COST_UPDATE: 'cost:update',
    COST_APPROVE: 'cost:approve',
    PROCUREMENT_VIEW: 'procurement:view',
    PROCUREMENT_CREATE: 'procurement:create',
    PROCUREMENT_UPDATE: 'procurement:update',
    PROCUREMENT_APPROVE: 'procurement:approve',
    SETTINGS_VIEW: 'settings:view',
    SETTINGS_UPDATE: 'settings:update',
    REPORTS_VIEW: 'reports:view',
    REPORTS_EXPORT: 'reports:export',
    AUDIT_VIEW: 'audit:view',
    IMPORTS_VIEW: 'imports:view',
    IMPORTS_RUN: 'imports:run',
};
exports.SYSTEM_ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    PROJECT_MANAGER: 'PROJECT_MANAGER',
    COST_CONTROLLER: 'COST_CONTROLLER',
    PROCUREMENT_OFFICER: 'PROCUREMENT_OFFICER',
    VIEWER: 'VIEWER',
};
exports.CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'QAR', 'BHD'];
exports.DEFAULT_PAGE = 1;
exports.DEFAULT_LIMIT = 25;
exports.MAX_LIMIT = 200;
exports.AUDIT_MODULES = {
    AUTH: 'auth',
    USERS: 'users',
    ROLES: 'roles',
    CLIENTS: 'clients',
    TENDERS: 'tenders',
    PROJECTS: 'projects',
    COST: 'cost',
    PROCUREMENT: 'procurement',
    SETTINGS: 'settings',
    IMPORTS: 'imports',
};
//# sourceMappingURL=index.js.map