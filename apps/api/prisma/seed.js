"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    const permissionDefs = [
        { code: 'users:view', nameAr: 'عرض المستخدمين', nameEn: 'View Users', module: 'users', action: 'view' },
        { code: 'users:create', nameAr: 'إنشاء مستخدم', nameEn: 'Create User', module: 'users', action: 'create' },
        { code: 'users:update', nameAr: 'تعديل مستخدم', nameEn: 'Update User', module: 'users', action: 'update' },
        { code: 'users:delete', nameAr: 'حذف مستخدم', nameEn: 'Delete User', module: 'users', action: 'delete' },
        { code: 'users:manage_roles', nameAr: 'إدارة أدوار المستخدمين', nameEn: 'Manage User Roles', module: 'users', action: 'manage_roles' },
        { code: 'roles:view', nameAr: 'عرض الأدوار', nameEn: 'View Roles', module: 'roles', action: 'view' },
        { code: 'roles:create', nameAr: 'إنشاء دور', nameEn: 'Create Role', module: 'roles', action: 'create' },
        { code: 'roles:update', nameAr: 'تعديل دور', nameEn: 'Update Role', module: 'roles', action: 'update' },
        { code: 'roles:delete', nameAr: 'حذف دور', nameEn: 'Delete Role', module: 'roles', action: 'delete' },
        { code: 'clients:view', nameAr: 'عرض العملاء', nameEn: 'View Clients', module: 'clients', action: 'view' },
        { code: 'clients:create', nameAr: 'إنشاء عميل', nameEn: 'Create Client', module: 'clients', action: 'create' },
        { code: 'clients:update', nameAr: 'تعديل عميل', nameEn: 'Update Client', module: 'clients', action: 'update' },
        { code: 'clients:delete', nameAr: 'حذف عميل', nameEn: 'Delete Client', module: 'clients', action: 'delete' },
        { code: 'tenders:view', nameAr: 'عرض المناقصات', nameEn: 'View Tenders', module: 'tenders', action: 'view' },
        { code: 'tenders:create', nameAr: 'إنشاء مناقصة', nameEn: 'Create Tender', module: 'tenders', action: 'create' },
        { code: 'tenders:update', nameAr: 'تعديل مناقصة', nameEn: 'Update Tender', module: 'tenders', action: 'update' },
        { code: 'tenders:delete', nameAr: 'حذف مناقصة', nameEn: 'Delete Tender', module: 'tenders', action: 'delete' },
        { code: 'projects:view', nameAr: 'عرض المشاريع', nameEn: 'View Projects', module: 'projects', action: 'view' },
        { code: 'projects:create', nameAr: 'إنشاء مشروع', nameEn: 'Create Project', module: 'projects', action: 'create' },
        { code: 'projects:update', nameAr: 'تعديل مشروع', nameEn: 'Update Project', module: 'projects', action: 'update' },
        { code: 'projects:delete', nameAr: 'حذف مشروع', nameEn: 'Delete Project', module: 'projects', action: 'delete' },
        { code: 'cost:view', nameAr: 'عرض التكاليف', nameEn: 'View Costs', module: 'cost', action: 'view' },
        { code: 'cost:create', nameAr: 'إدخال تكاليف', nameEn: 'Create Costs', module: 'cost', action: 'create' },
        { code: 'cost:update', nameAr: 'تعديل تكاليف', nameEn: 'Update Costs', module: 'cost', action: 'update' },
        { code: 'cost:approve', nameAr: 'اعتماد التكاليف', nameEn: 'Approve Costs', module: 'cost', action: 'approve' },
        { code: 'procurement:view', nameAr: 'عرض المشتريات', nameEn: 'View Procurement', module: 'procurement', action: 'view' },
        { code: 'procurement:create', nameAr: 'إنشاء طلب شراء', nameEn: 'Create Purchase Request', module: 'procurement', action: 'create' },
        { code: 'procurement:update', nameAr: 'تعديل طلب شراء', nameEn: 'Update Purchase Request', module: 'procurement', action: 'update' },
        { code: 'procurement:approve', nameAr: 'اعتماد طلب شراء', nameEn: 'Approve Purchase Request', module: 'procurement', action: 'approve' },
        { code: 'settings:view', nameAr: 'عرض الإعدادات', nameEn: 'View Settings', module: 'settings', action: 'view' },
        { code: 'settings:update', nameAr: 'تعديل الإعدادات', nameEn: 'Update Settings', module: 'settings', action: 'update' },
        { code: 'reports:view', nameAr: 'عرض التقارير', nameEn: 'View Reports', module: 'reports', action: 'view' },
        { code: 'reports:export', nameAr: 'تصدير التقارير', nameEn: 'Export Reports', module: 'reports', action: 'export' },
        { code: 'audit:view', nameAr: 'عرض سجل التدقيق', nameEn: 'View Audit Log', module: 'audit', action: 'view' },
        { code: 'imports:view', nameAr: 'عرض الاستيراد', nameEn: 'View Imports', module: 'imports', action: 'view' },
        { code: 'imports:run', nameAr: 'تشغيل الاستيراد', nameEn: 'Run Import', module: 'imports', action: 'run' },
    ];
    const permissions = await Promise.all(permissionDefs.map((p) => prisma.permission.upsert({
        where: { code: p.code },
        update: p,
        create: p,
    })));
    console.log(`✓ ${permissions.length} permissions seeded`);
    const allPermIds = permissions.map((p) => p.id);
    const superAdminRole = await prisma.role.upsert({
        where: { code: 'SUPER_ADMIN' },
        update: {},
        create: {
            code: 'SUPER_ADMIN',
            nameAr: 'مدير النظام',
            nameEn: 'Super Admin',
            isSystem: true,
        },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
    await prisma.rolePermission.createMany({
        data: allPermIds.map((pid) => ({ roleId: superAdminRole.id, permissionId: pid })),
        skipDuplicates: true,
    });
    const adminRole = await prisma.role.upsert({
        where: { code: 'ADMIN' },
        update: {},
        create: {
            code: 'ADMIN',
            nameAr: 'مشرف',
            nameEn: 'Admin',
            isSystem: true,
        },
    });
    const adminPermCodes = [
        'users:view', 'users:create', 'users:update', 'users:manage_roles',
        'roles:view',
        'clients:view', 'clients:create', 'clients:update',
        'tenders:view', 'tenders:create', 'tenders:update',
        'projects:view', 'projects:create', 'projects:update',
        'cost:view', 'cost:create', 'cost:update',
        'procurement:view', 'procurement:create', 'procurement:update',
        'settings:view', 'settings:update',
        'reports:view', 'reports:export',
        'audit:view',
        'imports:view', 'imports:run',
    ];
    const adminPermIds = permissions.filter((p) => adminPermCodes.includes(p.code)).map((p) => p.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
    await prisma.rolePermission.createMany({
        data: adminPermIds.map((pid) => ({ roleId: adminRole.id, permissionId: pid })),
        skipDuplicates: true,
    });
    const pmRole = await prisma.role.upsert({
        where: { code: 'PROJECT_MANAGER' },
        update: {},
        create: {
            code: 'PROJECT_MANAGER',
            nameAr: 'مدير مشروع',
            nameEn: 'Project Manager',
            isSystem: true,
        },
    });
    const pmPermCodes = [
        'clients:view',
        'tenders:view',
        'projects:view', 'projects:create', 'projects:update',
        'cost:view', 'cost:create', 'cost:update', 'cost:approve',
        'procurement:view', 'procurement:create', 'procurement:update', 'procurement:approve',
        'reports:view', 'reports:export',
    ];
    const pmPermIds = permissions.filter((p) => pmPermCodes.includes(p.code)).map((p) => p.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: pmRole.id } });
    await prisma.rolePermission.createMany({
        data: pmPermIds.map((pid) => ({ roleId: pmRole.id, permissionId: pid })),
        skipDuplicates: true,
    });
    const viewerRole = await prisma.role.upsert({
        where: { code: 'VIEWER' },
        update: {},
        create: {
            code: 'VIEWER',
            nameAr: 'مشاهد',
            nameEn: 'Viewer',
            isSystem: true,
        },
    });
    const viewerPermCodes = ['clients:view', 'tenders:view', 'projects:view', 'cost:view', 'procurement:view', 'reports:view'];
    const viewerPermIds = permissions.filter((p) => viewerPermCodes.includes(p.code)).map((p) => p.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: viewerRole.id } });
    await prisma.rolePermission.createMany({
        data: viewerPermIds.map((pid) => ({ roleId: viewerRole.id, permissionId: pid })),
        skipDuplicates: true,
    });
    console.log(`✓ Roles seeded`);
    const defaultSettings = [
        { key: 'system.nameAr', value: 'نظام التحكم بالتكاليف', type: 'string', module: 'system', labelAr: 'اسم النظام (عربي)', labelEn: 'System Name (Arabic)' },
        { key: 'system.nameEn', value: 'CDC System', type: 'string', module: 'system', labelAr: 'اسم النظام (إنجليزي)', labelEn: 'System Name (English)' },
        { key: 'system.defaultCurrency', value: 'SAR', type: 'string', module: 'system', labelAr: 'العملة الافتراضية', labelEn: 'Default Currency' },
        { key: 'system.defaultLanguage', value: 'ar', type: 'string', module: 'system', labelAr: 'اللغة الافتراضية', labelEn: 'Default Language' },
        { key: 'system.primaryColor', value: '#1e6fba', type: 'string', module: 'system', labelAr: 'اللون الرئيسي', labelEn: 'Primary Color' },
        { key: 'system.logoUrl', value: '', type: 'string', module: 'system', labelAr: 'رابط الشعار', labelEn: 'Logo URL' },
    ];
    await Promise.all(defaultSettings.map((s) => prisma.setting.upsert({
        where: { key: s.key },
        update: {},
        create: s,
    })));
    console.log(`✓ Settings seeded`);
    const hashedPassword = await bcrypt.hash('Admin@123456', 12);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@cdc-system.local' },
        update: {},
        create: {
            email: 'admin@cdc-system.local',
            password: hashedPassword,
            nameAr: 'مدير النظام',
            nameEn: 'System Admin',
            isActive: true,
        },
    });
    const existingAdminRole = await prisma.userRole.findFirst({
        where: { userId: adminUser.id, roleId: superAdminRole.id, projectId: null },
    });
    if (!existingAdminRole) {
        await prisma.userRole.create({
            data: { userId: adminUser.id, roleId: superAdminRole.id, projectId: null },
        });
    }
    console.log(`✓ Admin user seeded: admin@cdc-system.local / Admin@123456`);
    const demoClient = await prisma.client.upsert({
        where: { code: 'CLIENT-001' },
        update: {},
        create: {
            code: 'CLIENT-001',
            nameAr: 'شركة الإنشاءات الوطنية',
            nameEn: 'National Construction Co.',
            email: 'info@national-construction.example',
            phone: '+966500000001',
        },
    });
    const demoTender = await prisma.tender.upsert({
        where: { code: 'TND-2024-001' },
        update: {},
        create: {
            code: 'TND-2024-001',
            nameAr: 'مناقصة إنشاء مبنى إداري',
            nameEn: 'Administrative Building Construction Tender',
            clientId: demoClient.id,
            status: 'AWARDED',
            currency: 'SAR',
            value: 15000000,
        },
    });
    await prisma.project.upsert({
        where: { code: 'PRJ-2024-001' },
        update: {},
        create: {
            code: 'PRJ-2024-001',
            nameAr: 'مشروع المبنى الإداري',
            nameEn: 'Administrative Building Project',
            tenderId: demoTender.id,
            companyCode: 'HQ',
            currency: 'SAR',
            status: 'ACTIVE',
            contractValue: 15000000,
            startDate: new Date('2024-01-01'),
            endDate: new Date('2025-06-30'),
        },
    });
    console.log(`✓ Demo data seeded`);
    console.log('✅ Seed complete!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
