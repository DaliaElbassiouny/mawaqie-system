import {
  ActivityStatus,
  ApprovalStepStatus,
  ApprovalStatus,
  ExtractStatus,
  InvoiceStatus,
  LookaheadPriority,
  LookaheadStatus,
  PRApprovalStage,
  PRStatus,
  PrismaClient,
  ProjectSourceType,
  ProjectStatus,
  RequirementReadinessStatus,
  TenderStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_DEMO_PASSWORD;
if (process.env.NODE_ENV === 'production' && !SEED_PASSWORD) {
  throw new Error(
    'SEED_DEMO_PASSWORD must be set in production. ' +
    'Add it to Render dashboard environment variables before seeding.',
  );
}
if (!SEED_PASSWORD) {
  console.warn(
    '⚠️  SEED_DEMO_PASSWORD not set — using local dev fallback.\n' +
    '   Never run this seed in production without setting SEED_DEMO_PASSWORD.',
  );
}
const seedPassword = SEED_PASSWORD ?? 'CDC@LocalDev2026!';

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
  { code: 'operations:view', nameAr: 'عرض العمليات', nameEn: 'View Operations', module: 'operations', action: 'view' },
  { code: 'operations:create', nameAr: 'إنشاء جدول / نشاط', nameEn: 'Create Operation', module: 'operations', action: 'create' },
  { code: 'operations:update', nameAr: 'تعديل النشاط التشغيلي', nameEn: 'Update Operation', module: 'operations', action: 'update' },
  { code: 'operations:delete', nameAr: 'حذف نشاط تشغيلي', nameEn: 'Delete Operation', module: 'operations', action: 'delete' },
  { code: 'operations:approve', nameAr: 'اعتماد نشاط تشغيلي', nameEn: 'Approve Operation', module: 'operations', action: 'approve' },
  { code: 'settings:view', nameAr: 'عرض الإعدادات', nameEn: 'View Settings', module: 'settings', action: 'view' },
  { code: 'settings:update', nameAr: 'تعديل الإعدادات', nameEn: 'Update Settings', module: 'settings', action: 'update' },
  { code: 'reports:view', nameAr: 'عرض التقارير', nameEn: 'View Reports', module: 'reports', action: 'view' },
  { code: 'reports:export', nameAr: 'تصدير التقارير', nameEn: 'Export Reports', module: 'reports', action: 'export' },
  { code: 'audit:view', nameAr: 'عرض سجل التدقيق', nameEn: 'View Audit Log', module: 'audit', action: 'view' },
  { code: 'imports:view', nameAr: 'عرض الاستيراد', nameEn: 'View Imports', module: 'imports', action: 'view' },
  { code: 'imports:run', nameAr: 'تشغيل الاستيراد', nameEn: 'Run Import', module: 'imports', action: 'run' },
  { code: 'documents:view', nameAr: 'عرض المستندات', nameEn: 'View Documents', module: 'documents', action: 'view' },
  { code: 'documents:create', nameAr: 'رفع مستندات', nameEn: 'Upload Documents', module: 'documents', action: 'create' },
  { code: 'documents:delete', nameAr: 'حذف مستندات', nameEn: 'Delete Documents', module: 'documents', action: 'delete' },
  { code: 'notifications:view', nameAr: 'عرض الإشعارات', nameEn: 'View Notifications', module: 'notifications', action: 'view' },
] as const;

const roleDefinitions = [
  {
    code: 'SUPER_ADMIN',
    nameAr: 'مدير النظام',
    nameEn: 'Super Admin',
    isSystem: true,
    permissions: permissionDefs.map((p) => p.code),
  },
  {
    code: 'ADMIN',
    nameAr: 'مشرف',
    nameEn: 'Admin',
    isSystem: true,
    permissions: [
      // Users — no delete
      'users:view', 'users:create', 'users:update', 'users:manage_roles',
      // Roles — view only (structural changes are SUPER_ADMIN)
      'roles:view',
      // Clients / Tenders — no delete
      'clients:view', 'clients:create', 'clients:update',
      'tenders:view', 'tenders:create', 'tenders:update',
      // Projects — no delete
      'projects:view', 'projects:create', 'projects:update',
      // Operations — full including delete
      'operations:view', 'operations:create', 'operations:update', 'operations:delete', 'operations:approve',
      // Cost — full
      'cost:view', 'cost:create', 'cost:update', 'cost:approve',
      // Procurement — full
      'procurement:view', 'procurement:create', 'procurement:update', 'procurement:approve',
      // Settings / Reports / Audit / Imports — full
      'settings:view', 'settings:update',
      'reports:view', 'reports:export',
      'audit:view',
      'imports:view', 'imports:run',
      // Documents / Notifications
      'documents:view', 'documents:create', 'documents:delete',
      'notifications:view',
    ],
  },
  {
    code: 'OPERATIONS_MANAGER',
    nameAr: 'مدير عمليات',
    nameEn: 'Operations Manager',
    isSystem: true,
    permissions: [
      'clients:view', 'tenders:view',
      // Projects — view + update (no create/delete)
      'projects:view', 'projects:update',
      // Operations — no delete (SUPER_ADMIN/ADMIN only)
      'operations:view', 'operations:create', 'operations:update', 'operations:approve',
      // Cost — view only
      'cost:view',
      // Procurement — view only
      'procurement:view',
      // Reports + Documents + Notifications
      'reports:view', 'reports:export',
      'documents:view', 'documents:create',
      'notifications:view',
    ],
  },
  {
    code: 'PROJECT_MANAGER',
    nameAr: 'مدير مشروع',
    nameEn: 'Project Manager',
    isSystem: true,
    permissions: [
      'clients:view', 'tenders:view',
      // Projects — no delete
      'projects:view', 'projects:create', 'projects:update',
      // Operations — no delete
      'operations:view', 'operations:create', 'operations:update', 'operations:approve',
      // Cost — no approve (stays with COST_CONTROLLER / ADMIN)
      'cost:view', 'cost:create', 'cost:update',
      // Procurement — full (PM_REVIEW stage gate is enforced in service)
      'procurement:view', 'procurement:create', 'procurement:update', 'procurement:approve',
      'reports:view', 'reports:export',
      'documents:view', 'documents:create',
      'notifications:view',
    ],
  },
  {
    code: 'SITE_ENGINEER',
    nameAr: 'مهندس موقع',
    nameEn: 'Site Engineer',
    isSystem: true,
    permissions: [
      'projects:view',
      // Operations — no delete/approve
      'operations:view', 'operations:create', 'operations:update',
      // Procurement — view + create only (no update/approve)
      'procurement:view', 'procurement:create',
      // Documents + Notifications
      'documents:view', 'documents:create',
      'notifications:view',
      'reports:view',
    ],
  },
  {
    code: 'PROCUREMENT_OFFICER',
    nameAr: 'مسؤول مشتريات',
    nameEn: 'Procurement Officer',
    isSystem: true,
    permissions: [
      'projects:view', 'operations:view',
      'procurement:view', 'procurement:create', 'procurement:update', 'procurement:approve',
      'reports:view',
      'documents:view', 'documents:create',
      'notifications:view',
    ],
  },
  {
    code: 'COST_CONTROLLER',
    nameAr: 'مراقب تكاليف',
    nameEn: 'Cost Controller',
    isSystem: true,
    permissions: [
      'projects:view', 'operations:view',
      'cost:view', 'cost:create', 'cost:update', 'cost:approve',
      'procurement:view', 'procurement:approve',
      'reports:view', 'reports:export',
      'documents:view', 'documents:create',
      'notifications:view',
    ],
  },
  {
    code: 'EXECUTIVE_VIEWER',
    nameAr: 'مشاهد تنفيذي',
    nameEn: 'Executive Viewer',
    isSystem: true,
    permissions: [
      'clients:view', 'tenders:view',
      'projects:view', 'operations:view',
      'cost:view', 'procurement:view',
      'reports:view', 'reports:export',
      'documents:view',
      'notifications:view',
    ],
  },
  {
    // Kept as non-system legacy to preserve any existing user-role rows
    code: 'VIEWER',
    nameAr: 'مشاهد (قديم)',
    nameEn: 'Viewer (Legacy)',
    isSystem: false,
    permissions: ['clients:view', 'tenders:view', 'projects:view', 'cost:view', 'procurement:view', 'reports:view'],
  },
] as const;

const defaultSettings = [
  {
    key: 'system.nameAr',
    value: 'نظام التعمير والتنمية للمقاولات',
    type: 'string',
    module: 'system',
    labelAr: 'اسم النظام (عربي)',
    labelEn: 'System Name (Arabic)',
  },
  {
    key: 'system.nameEn',
    value: 'CDC System',
    type: 'string',
    module: 'system',
    labelAr: 'اسم النظام (إنجليزي)',
    labelEn: 'System Name (English)',
  },
  {
    key: 'system.defaultCurrency',
    value: 'SAR',
    type: 'string',
    module: 'system',
    labelAr: 'العملة الافتراضية',
    labelEn: 'Default Currency',
  },
  {
    key: 'system.defaultLanguage',
    value: 'ar',
    type: 'string',
    module: 'system',
    labelAr: 'اللغة الافتراضية',
    labelEn: 'Default Language',
  },
  {
    key: 'system.primaryColor',
    value: '#1e6fba',
    type: 'string',
    module: 'system',
    labelAr: 'اللون الرئيسي',
    labelEn: 'Primary Color',
  },
  {
    key: 'system.logoUrl',
    value: '',
    type: 'string',
    module: 'system',
    labelAr: 'رابط الشعار',
    labelEn: 'Logo URL',
  },
] as const;

type RequirementInput = {
  value?: string;
  status?: RequirementReadinessStatus;
  notes?: string;
};

type ActivitySeedInput = {
  code: string;
  nameAr: string;
  nameEn?: string;
  category: string;
  location?: string;
  status: ActivityStatus;
  lookaheadStatus: LookaheadStatus;
  priority: LookaheadPriority;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  progressPercent: number;
  responsibleUserId?: string | null;
  notes?: string;
  blockerReason?: string;
  labor?: RequirementInput;
  materials?: RequirementInput;
  equipment?: RequirementInput;
  expectedCost?: number | null;
  actualCost?: number | null;
  requiresApproval?: boolean;
  approvalStatus?: ApprovalStatus;
  approvedById?: string | null;
  approvalNote?: string | null;
};

function d(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function delayDays(plannedEnd?: Date | null, actualEnd?: Date | null) {
  if (!plannedEnd || !actualEnd) return 0;
  const diff = Math.floor((actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function normalizeText(value?: string | null) {
  if (!value) return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function buildActivitySeedData(input: ActivitySeedInput) {
  const requiredLabor = normalizeText(input.labor?.value);
  const requiredMaterials = normalizeText(input.materials?.value);
  const requiredEquipment = normalizeText(input.equipment?.value);
  const laborRequirementStatus = requiredLabor ? input.labor?.status ?? RequirementReadinessStatus.PENDING : null;
  const materialsRequirementStatus = requiredMaterials
    ? input.materials?.status ?? RequirementReadinessStatus.PENDING
    : null;
  const equipmentRequirementStatus = requiredEquipment
    ? input.equipment?.status ?? RequirementReadinessStatus.PENDING
    : null;
  const requirementEntries = [
    requiredLabor && laborRequirementStatus !== RequirementReadinessStatus.AVAILABLE ? requiredLabor : null,
    requiredMaterials && materialsRequirementStatus !== RequirementReadinessStatus.AVAILABLE ? requiredMaterials : null,
    requiredEquipment && equipmentRequirementStatus !== RequirementReadinessStatus.AVAILABLE ? requiredEquipment : null,
  ].filter(Boolean) as string[];
  const hasRequirements = !!(requiredLabor || requiredMaterials || requiredEquipment);
  const readyForExecution = hasRequirements ? requirementEntries.length === 0 : input.status !== ActivityStatus.BLOCKED;
  const missingRequirements = readyForExecution ? null : requirementEntries.join(' | ') || null;
  const plannedStart = input.plannedStart ? d(input.plannedStart) : null;
  const plannedEnd = input.plannedEnd ? d(input.plannedEnd) : null;
  const actualStart = input.actualStart ? d(input.actualStart) : null;
  const actualEnd = input.actualEnd ? d(input.actualEnd) : null;
  const requiresApproval = input.requiresApproval ?? false;
  const approvalStatus = requiresApproval
    ? input.approvalStatus ?? ApprovalStatus.PENDING
    : ApprovalStatus.NOT_REQUIRED;

  return {
    code: input.code,
    nameAr: input.nameAr,
    nameEn: input.nameEn ?? null,
    category: input.category,
    location: input.location ?? null,
    status: input.status,
    lookaheadStatus: input.lookaheadStatus,
    priority: input.priority,
    readyForExecution,
    missingRequirements,
    plannedStart,
    plannedEnd,
    actualStart,
    actualEnd,
    progressPercent: input.progressPercent,
    notes: input.notes ?? null,
    blockerReason: input.blockerReason ?? null,
    delayDays: delayDays(plannedEnd, actualEnd),
    requiredLabor,
    laborRequirementStatus,
    laborRequirementNotes: normalizeText(input.labor?.notes),
    requiredMaterials,
    materialsRequirementStatus,
    materialsRequirementNotes: normalizeText(input.materials?.notes),
    requiredEquipment,
    equipmentRequirementStatus,
    equipmentRequirementNotes: normalizeText(input.equipment?.notes),
    expectedCost: input.expectedCost ?? null,
    actualCost: input.actualCost ?? null,
    requiresApproval,
    approvalStatus,
    approvedById: input.approvedById ?? null,
    approvedAt:
      approvalStatus === ApprovalStatus.APPROVED || approvalStatus === ApprovalStatus.REJECTED
        ? d('2026-04-24')
        : null,
    approvalNote: input.approvalNote ?? null,
  };
}

async function main() {
  console.log('Seeding database...');

  const permissions = await Promise.all(
    permissionDefs.map((permission) =>
      prisma.permission.upsert({
        where: { code: permission.code },
        update: permission,
        create: permission,
      }),
    ),
  );
  const permissionIdByCode = new Map(permissions.map((permission) => [permission.code, permission.id]));
  console.log(`Seeded ${permissions.length} permissions`);

  const roles = new Map<string, string>();
  for (const definition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { code: definition.code },
      update: {
        nameAr: definition.nameAr,
        nameEn: definition.nameEn,
        isSystem: definition.isSystem,
      },
      create: {
        code: definition.code,
        nameAr: definition.nameAr,
        nameEn: definition.nameEn,
        isSystem: definition.isSystem,
      },
    });

    roles.set(definition.code, role.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: definition.permissions.map((code) => ({
        roleId: role.id,
        permissionId: permissionIdByCode.get(code)!,
      })),
      skipDuplicates: true,
    });
  }
  console.log(`Seeded ${roleDefinitions.length} roles`);

  await Promise.all(
    defaultSettings.map((setting) =>
      prisma.setting.upsert({
        where: { key: setting.key },
        update: setting,
        create: setting,
      }),
    ),
  );
  console.log('Seeded system settings');

  const hashedPassword = await bcrypt.hash(seedPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cdc-system.local' },
    update: {
      password: hashedPassword,
      nameAr: 'مدير النظام',
      nameEn: 'System Admin',
      isActive: true,
    },
    create: {
      email: 'admin@cdc-system.local',
      password: hashedPassword,
      nameAr: 'مدير النظام',
      nameEn: 'System Admin',
      isActive: true,
    },
  });

  await prisma.userRole.deleteMany({ where: { userId: adminUser.id, projectId: null } });
  await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: roles.get('SUPER_ADMIN')!, projectId: null },
  });

  // ── Role-test users: one per role ─────────────────────────────────────────
  // These 8 accounts cover every role for testing. Password = SEED_DEMO_PASSWORD.
  const roleTestUsers = {
    admin: await prisma.user.upsert({
      where: { email: 'manager@cdc-system.local' },
      update: { password: hashedPassword, nameAr: 'مدير النظام', nameEn: 'System Manager', isActive: true },
      create: { email: 'manager@cdc-system.local', password: hashedPassword, nameAr: 'مدير النظام', nameEn: 'System Manager', isActive: true },
    }),
    opsManager: await prisma.user.upsert({
      where: { email: 'ops.manager@cdc-system.local' },
      update: { password: hashedPassword, nameAr: 'مدير العمليات', nameEn: 'Operations Manager', isActive: true },
      create: { email: 'ops.manager@cdc-system.local', password: hashedPassword, nameAr: 'مدير العمليات', nameEn: 'Operations Manager', isActive: true },
    }),
    execViewer: await prisma.user.upsert({
      where: { email: 'viewer@cdc-system.local' },
      update: { password: hashedPassword, nameAr: 'المشاهد التنفيذي', nameEn: 'Executive Viewer', isActive: true },
      create: { email: 'viewer@cdc-system.local', password: hashedPassword, nameAr: 'المشاهد التنفيذي', nameEn: 'Executive Viewer', isActive: true },
    }),
  };

  const roleTestAssignments = [
    { userId: roleTestUsers.admin.id,       roleCode: 'ADMIN' },
    { userId: roleTestUsers.opsManager.id,  roleCode: 'OPERATIONS_MANAGER' },
    { userId: roleTestUsers.execViewer.id,  roleCode: 'EXECUTIVE_VIEWER' },
  ];
  for (const a of roleTestAssignments) {
    await prisma.userRole.deleteMany({ where: { userId: a.userId, projectId: null } });
    await prisma.userRole.create({ data: { userId: a.userId, roleId: roles.get(a.roleCode)!, projectId: null } });
  }
  console.log('Seeded role-test users (manager, ops.manager, viewer)');

  // ── Demo data users: kept for demo project/activity assignments ────────────
  const demoUsers = {
    rashed: await prisma.user.upsert({
      where: { email: 'rashed.pm@cdc-system.local' },
      update: {
        password: hashedPassword,
        nameAr: 'راشد العتيبي',
        nameEn: 'Rashed Alotaibi',
        phone: '+966500100001',
        isActive: true,
      },
      create: {
        email: 'rashed.pm@cdc-system.local',
        password: hashedPassword,
        nameAr: 'راشد العتيبي',
        nameEn: 'Rashed Alotaibi',
        phone: '+966500100001',
        isActive: true,
      },
    }),
    sara: await prisma.user.upsert({
      where: { email: 'sara.pm@cdc-system.local' },
      update: {
        password: hashedPassword,
        nameAr: 'سارة القحطاني',
        nameEn: 'Sara Alqahtani',
        phone: '+966500100002',
        isActive: true,
      },
      create: {
        email: 'sara.pm@cdc-system.local',
        password: hashedPassword,
        nameAr: 'سارة القحطاني',
        nameEn: 'Sara Alqahtani',
        phone: '+966500100002',
        isActive: true,
      },
    }),
    noura: await prisma.user.upsert({
      where: { email: 'noura.proc@cdc-system.local' },
      update: {
        password: hashedPassword,
        nameAr: 'نورة الزهراني',
        nameEn: 'Noura Alzahrani',
        phone: '+966500100003',
        isActive: true,
      },
      create: {
        email: 'noura.proc@cdc-system.local',
        password: hashedPassword,
        nameAr: 'نورة الزهراني',
        nameEn: 'Noura Alzahrani',
        phone: '+966500100003',
        isActive: true,
      },
    }),
    yousef: await prisma.user.upsert({
      where: { email: 'yousef.cost@cdc-system.local' },
      update: {
        password: hashedPassword,
        nameAr: 'يوسف الحربي',
        nameEn: 'Yousef Alharbi',
        phone: '+966500100004',
        isActive: true,
      },
      create: {
        email: 'yousef.cost@cdc-system.local',
        password: hashedPassword,
        nameAr: 'يوسف الحربي',
        nameEn: 'Yousef Alharbi',
        phone: '+966500100004',
        isActive: true,
      },
    }),
    ali: await prisma.user.upsert({
      where: { email: 'ali.site@cdc-system.local' },
      update: {
        password: hashedPassword,
        nameAr: 'علي الغامدي',
        nameEn: 'Ali Alghamdi',
        phone: '+966500100005',
        isActive: true,
      },
      create: {
        email: 'ali.site@cdc-system.local',
        password: hashedPassword,
        nameAr: 'علي الغامدي',
        nameEn: 'Ali Alghamdi',
        phone: '+966500100005',
        isActive: true,
      },
    }),
    mariam: await prisma.user.upsert({
      where: { email: 'mariam.site@cdc-system.local' },
      update: {
        password: hashedPassword,
        nameAr: 'مريم الشمري',
        nameEn: 'Mariam Alshammari',
        phone: '+966500100006',
        isActive: true,
      },
      create: {
        email: 'mariam.site@cdc-system.local',
        password: hashedPassword,
        nameAr: 'مريم الشمري',
        nameEn: 'Mariam Alshammari',
        phone: '+966500100006',
        isActive: true,
      },
    }),
  };

  const globalRoleAssignments = [
    { userId: demoUsers.rashed.id, roleCode: 'PROJECT_MANAGER' },
    { userId: demoUsers.sara.id, roleCode: 'PROJECT_MANAGER' },
    { userId: demoUsers.noura.id, roleCode: 'PROCUREMENT_OFFICER' },
    { userId: demoUsers.yousef.id, roleCode: 'COST_CONTROLLER' },
    { userId: demoUsers.ali.id, roleCode: 'SITE_ENGINEER' },
    { userId: demoUsers.mariam.id, roleCode: 'SITE_ENGINEER' },
  ];

  for (const assignment of globalRoleAssignments) {
    await prisma.userRole.deleteMany({ where: { userId: assignment.userId, projectId: null } });
    await prisma.userRole.create({
      data: {
        userId: assignment.userId,
        roleId: roles.get(assignment.roleCode)!,
        projectId: null,
      },
    });
  }
  console.log('Seeded demo users');

  await prisma.project.deleteMany({
    where: {
      code: {
        in: ['momo99', 'Coupon Code test'],
      },
    },
  });
  await prisma.tender.deleteMany({
    where: {
      code: {
        in: ['Coupon Code test'],
      },
    },
  });
  await prisma.client.deleteMany({
    where: {
      code: {
        in: ['momo99'],
      },
    },
  });

  const clients = {
    national: await prisma.client.upsert({
      where: { code: 'CLIENT-001' },
      update: {
        nameAr: 'شركة الإنشاءات الوطنية',
        nameEn: 'National Construction Co.',
        email: 'info@national-construction.example',
        phone: '+966500000001',
        address: 'الرياض - حي الصحافة',
        isActive: true,
      },
      create: {
        code: 'CLIENT-001',
        nameAr: 'شركة الإنشاءات الوطنية',
        nameEn: 'National Construction Co.',
        email: 'info@national-construction.example',
        phone: '+966500000001',
        address: 'الرياض - حي الصحافة',
        isActive: true,
      },
    }),
    rta: await prisma.client.upsert({
      where: { code: 'CLIENT-002' },
      update: {
        nameAr: 'هيئة الطرق والمواصلات',
        nameEn: 'Roads & Transport Authority',
        email: 'tenders@rta.example',
        phone: '+966500000002',
        address: 'جدة - طريق الملك',
        isActive: true,
      },
      create: {
        code: 'CLIENT-002',
        nameAr: 'هيئة الطرق والمواصلات',
        nameEn: 'Roads & Transport Authority',
        email: 'tenders@rta.example',
        phone: '+966500000002',
        address: 'جدة - طريق الملك',
        isActive: true,
      },
    }),
    university: await prisma.client.upsert({
      where: { code: 'CLIENT-003' },
      update: {
        nameAr: 'جامعة التقنية التطبيقية',
        nameEn: 'Applied Technology University',
        email: 'projects@atu.example',
        phone: '+966500000003',
        address: 'الدمام - المدينة الجامعية',
        isActive: true,
      },
      create: {
        code: 'CLIENT-003',
        nameAr: 'جامعة التقنية التطبيقية',
        nameEn: 'Applied Technology University',
        email: 'projects@atu.example',
        phone: '+966500000003',
        address: 'الدمام - المدينة الجامعية',
        isActive: true,
      },
    }),
    development: await prisma.client.upsert({
      where: { code: 'CLIENT-004' },
      update: {
        nameAr: 'شركة تطوير الواجهات العمرانية',
        nameEn: 'Urban Fronts Development',
        email: 'procurement@ufd.example',
        phone: '+966500000004',
        address: 'نيوم - المنطقة الصناعية',
        isActive: true,
      },
      create: {
        code: 'CLIENT-004',
        nameAr: 'شركة تطوير الواجهات العمرانية',
        nameEn: 'Urban Fronts Development',
        email: 'procurement@ufd.example',
        phone: '+966500000004',
        address: 'نيوم - المنطقة الصناعية',
        isActive: true,
      },
    }),
  };

  const tenders = {
    adminBuilding: await prisma.tender.upsert({
      where: { code: 'TND-2024-001' },
      update: {
        nameAr: 'برج المكاتب الإدارية',
        nameEn: 'Administrative Office Tower',
        clientId: clients.national.id,
        status: TenderStatus.CONTRACTED,
        location: 'الرياض',
        projectType: 'إنشاءات مدنية',
        leadSource: 'منافسة حكومية',
        currency: 'SAR',
        estimatedValue: 15200000,
        submittedValue: 14850000,
        bidReceiptDate: d('2026-01-10'),
        dueDate: d('2026-01-30'),
        submittedAt: d('2026-01-29'),
        awardedAt: d('2026-02-05'),
        bidResult: 'ترسية',
        assignedEngineer: 'راشد العتيبي',
        notes: 'مناقصة رئيسية لمبنى إداري من ستة أدوار.',
      },
      create: {
        code: 'TND-2024-001',
        nameAr: 'برج المكاتب الإدارية',
        nameEn: 'Administrative Office Tower',
        clientId: clients.national.id,
        status: TenderStatus.CONTRACTED,
        location: 'الرياض',
        projectType: 'إنشاءات مدنية',
        leadSource: 'منافسة حكومية',
        currency: 'SAR',
        estimatedValue: 15200000,
        submittedValue: 14850000,
        bidReceiptDate: d('2026-01-10'),
        dueDate: d('2026-01-30'),
        submittedAt: d('2026-01-29'),
        awardedAt: d('2026-02-05'),
        bidResult: 'ترسية',
        assignedEngineer: 'راشد العتيبي',
        notes: 'مناقصة رئيسية لمبنى إداري من ستة أدوار.',
      },
    }),
    roads: await prisma.tender.upsert({
      where: { code: 'TND-2024-002' },
      update: {
        nameAr: 'تطوير شبكة الطرق الداخلية',
        nameEn: 'Internal Road Network Development',
        clientId: clients.rta.id,
        status: TenderStatus.PRICING_IN_PROGRESS,
        location: 'جدة',
        projectType: 'بنية تحتية',
        leadSource: 'علاقات تجارية',
        currency: 'SAR',
        estimatedValue: 8600000,
        submittedValue: null,
        bidReceiptDate: d('2026-05-01'),
        dueDate: d('2026-05-28'),
        submittedAt: null,
        awardedAt: null,
        bidResult: null,
        assignedEngineer: 'سارة القحطاني',
        notes: 'يشمل تحسين مسارات الخدمة والإنارة.',
      },
      create: {
        code: 'TND-2024-002',
        nameAr: 'تطوير شبكة الطرق الداخلية',
        nameEn: 'Internal Road Network Development',
        clientId: clients.rta.id,
        status: TenderStatus.PRICING_IN_PROGRESS,
        location: 'جدة',
        projectType: 'بنية تحتية',
        leadSource: 'علاقات تجارية',
        currency: 'SAR',
        estimatedValue: 8600000,
        submittedValue: null,
        bidReceiptDate: d('2026-05-01'),
        dueDate: d('2026-05-28'),
        submittedAt: null,
        awardedAt: null,
        bidResult: null,
        assignedEngineer: 'سارة القحطاني',
        notes: 'يشمل تحسين مسارات الخدمة والإنارة.',
      },
    }),
    warehouse: await prisma.tender.upsert({
      where: { code: 'TND-2024-003' },
      update: {
        nameAr: 'إنشاء مستودع لوجستي',
        nameEn: 'Logistics Warehouse Construction',
        clientId: clients.national.id,
        status: TenderStatus.PRICED_SUBMITTED,
        location: 'الدمام',
        projectType: 'صناعي',
        leadSource: 'عميل مباشر',
        currency: 'SAR',
        estimatedValue: 6400000,
        submittedValue: 6120000,
        bidReceiptDate: d('2026-03-01'),
        dueDate: d('2026-03-24'),
        submittedAt: d('2026-03-22'),
        awardedAt: null,
        bidResult: null,
        assignedEngineer: 'راشد العتيبي',
        notes: 'قيد انتظار نتيجة فنية ومالية.',
      },
      create: {
        code: 'TND-2024-003',
        nameAr: 'إنشاء مستودع لوجستي',
        nameEn: 'Logistics Warehouse Construction',
        clientId: clients.national.id,
        status: TenderStatus.PRICED_SUBMITTED,
        location: 'الدمام',
        projectType: 'صناعي',
        leadSource: 'عميل مباشر',
        currency: 'SAR',
        estimatedValue: 6400000,
        submittedValue: 6120000,
        bidReceiptDate: d('2026-03-01'),
        dueDate: d('2026-03-24'),
        submittedAt: d('2026-03-22'),
        awardedAt: null,
        bidResult: null,
        assignedEngineer: 'راشد العتيبي',
        notes: 'قيد انتظار نتيجة فنية ومالية.',
      },
    }),
    sanitation: await prisma.tender.upsert({
      where: { code: 'TND-2024-004' },
      update: {
        nameAr: 'تحسين شبكة الصرف الصحي',
        nameEn: 'Sanitation Network Improvement',
        clientId: clients.rta.id,
        status: TenderStatus.LOST,
        location: 'مكة المكرمة',
        projectType: 'بنية تحتية',
        leadSource: 'منافسة حكومية',
        currency: 'SAR',
        estimatedValue: 12100000,
        submittedValue: 11800000,
        bidReceiptDate: d('2025-12-15'),
        dueDate: d('2026-01-12'),
        submittedAt: d('2026-01-11'),
        awardedAt: null,
        bidResult: 'خسارة فنية',
        assignedEngineer: 'سارة القحطاني',
        notes: 'تمت الخسارة بسبب وزن البند الفني.',
      },
      create: {
        code: 'TND-2024-004',
        nameAr: 'تحسين شبكة الصرف الصحي',
        nameEn: 'Sanitation Network Improvement',
        clientId: clients.rta.id,
        status: TenderStatus.LOST,
        location: 'مكة المكرمة',
        projectType: 'بنية تحتية',
        leadSource: 'منافسة حكومية',
        currency: 'SAR',
        estimatedValue: 12100000,
        submittedValue: 11800000,
        bidReceiptDate: d('2025-12-15'),
        dueDate: d('2026-01-12'),
        submittedAt: d('2026-01-11'),
        awardedAt: null,
        bidResult: 'خسارة فنية',
        assignedEngineer: 'سارة القحطاني',
        notes: 'تمت الخسارة بسبب وزن البند الفني.',
      },
    }),
    labs: await prisma.tender.upsert({
      where: { code: 'TND-2025-005' },
      update: {
        nameAr: 'مجمع المختبرات المركزي',
        nameEn: 'Central Laboratories Complex',
        clientId: clients.university.id,
        status: TenderStatus.CONTRACTED,
        location: 'جدة',
        projectType: 'تعليمي / مختبرات',
        leadSource: 'دعوة مباشرة',
        currency: 'SAR',
        estimatedValue: 9850000,
        submittedValue: 9640000,
        bidReceiptDate: d('2026-02-03'),
        dueDate: d('2026-02-22'),
        submittedAt: d('2026-02-21'),
        awardedAt: d('2026-03-01'),
        bidResult: 'ترسية',
        assignedEngineer: 'سارة القحطاني',
        notes: 'المرحلة الأولى من أعمال المختبرات والخدمات.',
      },
      create: {
        code: 'TND-2025-005',
        nameAr: 'مجمع المختبرات المركزي',
        nameEn: 'Central Laboratories Complex',
        clientId: clients.university.id,
        status: TenderStatus.CONTRACTED,
        location: 'جدة',
        projectType: 'تعليمي / مختبرات',
        leadSource: 'دعوة مباشرة',
        currency: 'SAR',
        estimatedValue: 9850000,
        submittedValue: 9640000,
        bidReceiptDate: d('2026-02-03'),
        dueDate: d('2026-02-22'),
        submittedAt: d('2026-02-21'),
        awardedAt: d('2026-03-01'),
        bidResult: 'ترسية',
        assignedEngineer: 'سارة القحطاني',
        notes: 'المرحلة الأولى من أعمال المختبرات والخدمات.',
      },
    }),
    facades: await prisma.tender.upsert({
      where: { code: 'TND-2025-006' },
      update: {
        nameAr: 'توريد وتركيب واجهات ألمنيوم',
        nameEn: 'Aluminium Facades Supply & Installation',
        clientId: clients.development.id,
        status: TenderStatus.PRICING_IN_PROGRESS,
        location: 'نيوم',
        projectType: 'تشطيبات خارجية',
        leadSource: 'عميل مباشر',
        currency: 'SAR',
        estimatedValue: 4300000,
        submittedValue: null,
        bidReceiptDate: d('2026-04-18'),
        dueDate: d('2026-05-07'),
        submittedAt: null,
        awardedAt: null,
        bidResult: null,
        assignedEngineer: 'راشد العتيبي',
        notes: 'تسعير واجهات ألمنيوم وستائر زجاجية.',
      },
      create: {
        code: 'TND-2025-006',
        nameAr: 'توريد وتركيب واجهات ألمنيوم',
        nameEn: 'Aluminium Facades Supply & Installation',
        clientId: clients.development.id,
        status: TenderStatus.PRICING_IN_PROGRESS,
        location: 'نيوم',
        projectType: 'تشطيبات خارجية',
        leadSource: 'عميل مباشر',
        currency: 'SAR',
        estimatedValue: 4300000,
        submittedValue: null,
        bidReceiptDate: d('2026-04-18'),
        dueDate: d('2026-05-07'),
        submittedAt: null,
        awardedAt: null,
        bidResult: null,
        assignedEngineer: 'راشد العتيبي',
        notes: 'تسعير واجهات ألمنيوم وستائر زجاجية.',
      },
    }),
    servicesHub: await prisma.tender.upsert({
      where: { code: 'TND-2025-007' },
      update: {
        nameAr: 'مبنى الخدمات المركزية',
        nameEn: 'Central Services Building',
        clientId: clients.development.id,
        status: TenderStatus.CONTRACTED,
        location: 'الخبر',
        projectType: 'مرافق وخدمات',
        leadSource: 'عميل مباشر',
        currency: 'SAR',
        estimatedValue: 6150000,
        submittedValue: 5980000,
        bidReceiptDate: d('2026-03-12'),
        dueDate: d('2026-03-30'),
        submittedAt: d('2026-03-29'),
        awardedAt: d('2026-04-06'),
        bidResult: 'ترسية',
        assignedEngineer: 'سارة القحطاني',
        notes: 'مشروع خدمات مساندة يضم غرف الخدمات وسطح الخدمات مع تعديلات تنسيقية لأعمال MEP.',
      },
      create: {
        code: 'TND-2025-007',
        nameAr: 'مبنى الخدمات المركزية',
        nameEn: 'Central Services Building',
        clientId: clients.development.id,
        status: TenderStatus.CONTRACTED,
        location: 'الخبر',
        projectType: 'مرافق وخدمات',
        leadSource: 'عميل مباشر',
        currency: 'SAR',
        estimatedValue: 6150000,
        submittedValue: 5980000,
        bidReceiptDate: d('2026-03-12'),
        dueDate: d('2026-03-30'),
        submittedAt: d('2026-03-29'),
        awardedAt: d('2026-04-06'),
        bidResult: 'ترسية',
        assignedEngineer: 'سارة القحطاني',
        notes: 'مشروع خدمات مساندة يضم غرف الخدمات وسطح الخدمات مع تعديلات تنسيقية لأعمال MEP.',
      },
    }),
  };

  const projects = {
    adminBuilding: await prisma.project.upsert({
      where: { code: 'PRJ-2024-001' },
      update: {
        nameAr: 'برج المكاتب الإدارية',
        nameEn: 'Administrative Office Tower',
        tenderId: tenders.adminBuilding.id,
        sourceType: ProjectSourceType.TENDER,
        companyCode: 'HQ',
        location: 'الرياض',
        projectType: 'إنشاءات مدنية',
        currency: 'SAR',
        status: ProjectStatus.ACTIVE,
        contractValue: 14850000,
        startDate: d('2026-02-15'),
        endDate: d('2026-08-30'),
        notes: 'المرحلة الحالية تشمل أعمال القواعد والبدروم الأول.',
      },
      create: {
        code: 'PRJ-2024-001',
        nameAr: 'برج المكاتب الإدارية',
        nameEn: 'Administrative Office Tower',
        tenderId: tenders.adminBuilding.id,
        sourceType: ProjectSourceType.TENDER,
        companyCode: 'HQ',
        location: 'الرياض',
        projectType: 'إنشاءات مدنية',
        currency: 'SAR',
        status: ProjectStatus.ACTIVE,
        contractValue: 14850000,
        startDate: d('2026-02-15'),
        endDate: d('2026-08-30'),
        notes: 'المرحلة الحالية تشمل أعمال القواعد والبدروم الأول.',
      },
    }),
    labs: await prisma.project.upsert({
      where: { code: 'PRJ-2025-002' },
      update: {
        nameAr: 'مجمع المختبرات المركزي',
        nameEn: 'Central Laboratories Complex',
        tenderId: tenders.labs.id,
        sourceType: ProjectSourceType.TENDER,
        companyCode: 'WEST',
        location: 'جدة',
        projectType: 'تعليمي / مختبرات',
        currency: 'SAR',
        status: ProjectStatus.ACTIVE,
        contractValue: 9640000,
        startDate: d('2026-03-10'),
        endDate: d('2026-12-20'),
        notes: 'يجري تجهيز المباني الخدمية والبنية التحتية للمختبرات.',
      },
      create: {
        code: 'PRJ-2025-002',
        nameAr: 'مجمع المختبرات المركزي',
        nameEn: 'Central Laboratories Complex',
        tenderId: tenders.labs.id,
        sourceType: ProjectSourceType.TENDER,
        companyCode: 'WEST',
        location: 'جدة',
        projectType: 'تعليمي / مختبرات',
        currency: 'SAR',
        status: ProjectStatus.ACTIVE,
        contractValue: 9640000,
        startDate: d('2026-03-10'),
        endDate: d('2026-12-20'),
        notes: 'يجري تجهيز المباني الخدمية والبنية التحتية للمختبرات.',
      },
    }),
    camp: await prisma.project.upsert({
      where: { code: 'PRJ-DIR-001' },
      update: {
        nameAr: 'تجهيز موقع إسكان العمال',
        nameEn: 'Workers Camp Mobilization',
        tenderId: null,
        sourceType: ProjectSourceType.DIRECT,
        companyCode: 'NEOM',
        location: 'نيوم',
        projectType: 'مباشر / تجهيز موقع',
        currency: 'SAR',
        status: ProjectStatus.ACTIVE,
        contractValue: 1850000,
        startDate: d('2026-03-20'),
        endDate: d('2026-06-15'),
        notes: 'مشروع مباشر لتجهيز سكن العمال والمرافق المؤقتة.',
      },
      create: {
        code: 'PRJ-DIR-001',
        nameAr: 'تجهيز موقع إسكان العمال',
        nameEn: 'Workers Camp Mobilization',
        tenderId: null,
        sourceType: ProjectSourceType.DIRECT,
        companyCode: 'NEOM',
        location: 'نيوم',
        projectType: 'مباشر / تجهيز موقع',
        currency: 'SAR',
        status: ProjectStatus.ACTIVE,
        contractValue: 1850000,
        startDate: d('2026-03-20'),
        endDate: d('2026-06-15'),
        notes: 'مشروع مباشر لتجهيز سكن العمال والمرافق المؤقتة.',
      },
    }),
    maintenance: await prisma.project.upsert({
      where: { code: 'PRJ-DIR-002' },
      update: {
        nameAr: 'صيانة مبنى الخدمات',
        nameEn: 'Services Building Maintenance',
        tenderId: null,
        sourceType: ProjectSourceType.DIRECT,
        companyCode: 'EAST',
        location: 'الدمام',
        projectType: 'صيانة',
        currency: 'SAR',
        status: ProjectStatus.COMPLETED,
        contractValue: 920000,
        startDate: d('2026-01-08'),
        endDate: d('2026-03-30'),
        notes: 'أعمال مباشرة للصيانة والتشطيبات الخفيفة.',
      },
      create: {
        code: 'PRJ-DIR-002',
        nameAr: 'صيانة مبنى الخدمات',
        nameEn: 'Services Building Maintenance',
        tenderId: null,
        sourceType: ProjectSourceType.DIRECT,
        companyCode: 'EAST',
        location: 'الدمام',
        projectType: 'صيانة',
        currency: 'SAR',
        status: ProjectStatus.COMPLETED,
        contractValue: 920000,
        startDate: d('2026-01-08'),
        endDate: d('2026-03-30'),
        notes: 'أعمال مباشرة للصيانة والتشطيبات الخفيفة.',
      },
    }),
    servicesHub: await prisma.project.upsert({
      where: { code: 'PRJ-2025-003' },
      update: {
        nameAr: 'مبنى الخدمات المركزية',
        nameEn: 'Central Services Building',
        tenderId: tenders.servicesHub.id,
        sourceType: ProjectSourceType.TENDER,
        companyCode: 'EAST',
        location: 'الخبر',
        projectType: 'مرافق وخدمات',
        currency: 'SAR',
        status: ProjectStatus.ACTIVE,
        contractValue: 5980000,
        startDate: d('2026-04-08'),
        endDate: d('2026-10-15'),
        notes: 'المشروع في وضع تنفيذي جيد، لكن تكلفة أعمال MEP ارتفعت بسبب تحويلات مسارات وخدمات إضافية مطلوبة من الاستشاري.',
      },
      create: {
        code: 'PRJ-2025-003',
        nameAr: 'مبنى الخدمات المركزية',
        nameEn: 'Central Services Building',
        tenderId: tenders.servicesHub.id,
        sourceType: ProjectSourceType.TENDER,
        companyCode: 'EAST',
        location: 'الخبر',
        projectType: 'مرافق وخدمات',
        currency: 'SAR',
        status: ProjectStatus.ACTIVE,
        contractValue: 5980000,
        startDate: d('2026-04-08'),
        endDate: d('2026-10-15'),
        notes: 'المشروع في وضع تنفيذي جيد، لكن تكلفة أعمال MEP ارتفعت بسبب تحويلات مسارات وخدمات إضافية مطلوبة من الاستشاري.',
      },
    }),
  };

  const demoProjectIds = Object.values(projects).map((project) => project.id);
  const demoLogIds = await prisma.dailyLog.findMany({
    where: { projectId: { in: demoProjectIds } },
    select: { id: true },
  });
  const demoPurchaseRequests = await prisma.purchaseRequest.findMany({
    where: { projectId: { in: demoProjectIds } },
    select: { id: true },
  });
  const demoInvoices = await prisma.invoice.findMany({
    where: { projectId: { in: demoProjectIds } },
    select: { id: true },
  });
  const demoExtracts = await prisma.extract.findMany({
    where: { projectId: { in: demoProjectIds } },
    select: { id: true },
  });
  const demoPurchaseRequestIds = demoPurchaseRequests.map((request) => request.id);
  const demoInvoiceIds = demoInvoices.map((invoice) => invoice.id);
  const demoExtractIds = demoExtracts.map((extract) => extract.id);

  if (demoLogIds.length > 0) {
    await prisma.dailyLogActivity.deleteMany({
      where: { dailyLogId: { in: demoLogIds.map((log) => log.id) } },
    });
  }

  if (demoPurchaseRequestIds.length > 0) {
    await prisma.document.deleteMany({
      where: {
        entityType: 'purchase_request',
        entityId: { in: demoPurchaseRequestIds },
      },
    });
    await prisma.notification.deleteMany({
      where: {
        entityType: 'purchase_request',
        entityId: { in: demoPurchaseRequestIds },
      },
    });
    await prisma.purchaseRequestApprovalStep.deleteMany({
      where: { prId: { in: demoPurchaseRequestIds } },
    });
    await prisma.purchaseRequestItem.deleteMany({
      where: { prId: { in: demoPurchaseRequestIds } },
    });
  }

  if (demoInvoiceIds.length > 0) {
    await prisma.document.deleteMany({
      where: {
        entityType: 'invoice',
        entityId: { in: demoInvoiceIds },
      },
    });
    await prisma.notification.deleteMany({
      where: {
        entityType: 'invoice',
        entityId: { in: demoInvoiceIds },
      },
    });
  }

  if (demoExtractIds.length > 0) {
    await prisma.document.deleteMany({
      where: {
        entityType: 'extract',
        entityId: { in: demoExtractIds },
      },
    });
    await prisma.notification.deleteMany({
      where: {
        entityType: 'extract',
        entityId: { in: demoExtractIds },
      },
    });
  }

  await prisma.dailyLog.deleteMany({ where: { projectId: { in: demoProjectIds } } });
  await prisma.purchaseRequest.deleteMany({ where: { projectId: { in: demoProjectIds } } });
  await prisma.invoice.deleteMany({ where: { projectId: { in: demoProjectIds } } });
  await prisma.extract.deleteMany({ where: { projectId: { in: demoProjectIds } } });
  await prisma.operationActivity.deleteMany({ where: { projectId: { in: demoProjectIds } } });
  await prisma.operationSchedule.deleteMany({ where: { projectId: { in: demoProjectIds } } });
  await prisma.costItem.deleteMany({ where: { projectId: { in: demoProjectIds } } });
  await prisma.userRole.deleteMany({ where: { projectId: { in: demoProjectIds } } });

  const teamAssignments = [
    { projectId: projects.adminBuilding.id, userId: demoUsers.rashed.id, roleCode: 'PROJECT_MANAGER' },
    { projectId: projects.adminBuilding.id, userId: demoUsers.noura.id, roleCode: 'PROCUREMENT_OFFICER' },
    { projectId: projects.adminBuilding.id, userId: demoUsers.yousef.id, roleCode: 'COST_CONTROLLER' },
    { projectId: projects.adminBuilding.id, userId: demoUsers.ali.id, roleCode: 'SITE_ENGINEER' },
    { projectId: projects.adminBuilding.id, userId: demoUsers.mariam.id, roleCode: 'SITE_ENGINEER' },
    { projectId: projects.labs.id, userId: demoUsers.sara.id, roleCode: 'PROJECT_MANAGER' },
    { projectId: projects.labs.id, userId: demoUsers.noura.id, roleCode: 'PROCUREMENT_OFFICER' },
    { projectId: projects.labs.id, userId: demoUsers.yousef.id, roleCode: 'COST_CONTROLLER' },
    { projectId: projects.labs.id, userId: demoUsers.mariam.id, roleCode: 'SITE_ENGINEER' },
    { projectId: projects.camp.id, userId: demoUsers.rashed.id, roleCode: 'PROJECT_MANAGER' },
    { projectId: projects.camp.id, userId: demoUsers.noura.id, roleCode: 'PROCUREMENT_OFFICER' },
    { projectId: projects.camp.id, userId: demoUsers.ali.id, roleCode: 'SITE_ENGINEER' },
    { projectId: projects.maintenance.id, userId: demoUsers.sara.id, roleCode: 'PROJECT_MANAGER' },
    { projectId: projects.maintenance.id, userId: demoUsers.yousef.id, roleCode: 'COST_CONTROLLER' },
    { projectId: projects.servicesHub.id, userId: demoUsers.sara.id, roleCode: 'PROJECT_MANAGER' },
    { projectId: projects.servicesHub.id, userId: demoUsers.noura.id, roleCode: 'PROCUREMENT_OFFICER' },
    { projectId: projects.servicesHub.id, userId: demoUsers.yousef.id, roleCode: 'COST_CONTROLLER' },
    { projectId: projects.servicesHub.id, userId: demoUsers.ali.id, roleCode: 'SITE_ENGINEER' },
    { projectId: projects.servicesHub.id, userId: demoUsers.mariam.id, roleCode: 'SITE_ENGINEER' },
  ];

  await prisma.userRole.createMany({
    data: teamAssignments.map((assignment) => ({
      projectId: assignment.projectId,
      userId: assignment.userId,
      roleId: roles.get(assignment.roleCode)!,
    })),
    skipDuplicates: true,
  });

  const scheduleByKey = new Map<string, string>();
  const scheduleDefs = [
    { projectId: projects.adminBuilding.id, key: 'admin-apr', year: 2026, month: 4, title: 'أعمال القواعد والبدروم', notes: 'الأسبوع الحالي يركز على حديد القواعد والشدات.' },
    { projectId: projects.adminBuilding.id, key: 'admin-may', year: 2026, month: 5, title: 'أعمال الخرسانة والبدروم', notes: 'بدء صب القواعد والعزل.' },
    { projectId: projects.labs.id, key: 'labs-apr', year: 2026, month: 4, title: 'تهيئة الموقع وبداية الميدات', notes: 'الأولوية لخنادق الخدمات وحديد الميدات.' },
    { projectId: projects.labs.id, key: 'labs-may', year: 2026, month: 5, title: 'الهيكل السفلي', notes: 'صب الميدات والتجهيزات الأولية.' },
    { projectId: projects.camp.id, key: 'camp-apr', year: 2026, month: 4, title: 'التجهيزات المؤقتة', notes: 'توريد الكونتينرات والخدمات المؤقتة.' },
    { projectId: projects.camp.id, key: 'camp-may', year: 2026, month: 5, title: 'مرحلة الإقفال', notes: 'استكمال العزل والتشطيبات الأولية.' },
    { projectId: projects.servicesHub.id, key: 'services-apr', year: 2026, month: 4, title: 'غرف الخدمات والتهيئة', notes: 'التركيز على القواعد وخدمات MEP الأرضية.' },
    { projectId: projects.servicesHub.id, key: 'services-may', year: 2026, month: 5, title: 'سطح الخدمات والأعمال الكهروميكانيكية', notes: 'متابعة التحويلات والتنسيق مع الاستشاري.' },
    { projectId: projects.maintenance.id, key: 'maint-mar', year: 2026, month: 3, title: 'إقفال الصيانة', notes: 'آخر أعمال التشطيب والتسليم.' },
  ];

  for (const scheduleDef of scheduleDefs) {
    const schedule = await prisma.operationSchedule.create({
      data: {
        projectId: scheduleDef.projectId,
        year: scheduleDef.year,
        month: scheduleDef.month,
        title: scheduleDef.title,
        notes: scheduleDef.notes,
        createdById: adminUser.id,
      },
    });
    scheduleByKey.set(scheduleDef.key, schedule.id);
  }

  const activitySeeds = [
    {
      projectId: projects.adminBuilding.id,
      scheduleId: scheduleByKey.get('admin-apr')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-001',
        nameAr: 'تجهيز موقع العمل والسور المؤقت',
        nameEn: 'Site Mobilization and Temporary Fence',
        category: 'ADMIN',
        location: 'المدخل الرئيسي',
        status: ActivityStatus.COMPLETED,
        lookaheadStatus: LookaheadStatus.DONE,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-04-05',
        plannedEnd: '2026-04-07',
        actualStart: '2026-04-05',
        actualEnd: '2026-04-06',
        progressPercent: 100,
        notes: 'تم استلام الموقع وتجهيز مكاتب الإشراف.',
        expectedCost: 45000,
        actualCost: 42000,
      }),
    },
    {
      projectId: projects.adminBuilding.id,
      scheduleId: scheduleByKey.get('admin-apr')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-002',
        nameAr: 'أعمال حفر القواعد',
        category: 'CIVIL',
        location: 'محور A-B',
        status: ActivityStatus.COMPLETED,
        lookaheadStatus: LookaheadStatus.DONE,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-04-08',
        plannedEnd: '2026-04-12',
        actualStart: '2026-04-08',
        actualEnd: '2026-04-13',
        progressPercent: 100,
        equipment: {
          value: 'حفار + قلابات نقل',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        expectedCost: 120000,
        actualCost: 128000,
      }),
    },
    {
      projectId: projects.adminBuilding.id,
      scheduleId: scheduleByKey.get('admin-apr')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-003',
        nameAr: 'دفان تحت الأساسات',
        category: 'CIVIL',
        location: 'المناسيب المنخفضة',
        status: ActivityStatus.IN_PROGRESS,
        lookaheadStatus: LookaheadStatus.IN_PROGRESS,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-04-18',
        plannedEnd: '2026-04-28',
        actualStart: '2026-04-18',
        progressPercent: 65,
        materials: {
          value: 'رمل دفان وطبقة أساس',
          status: RequirementReadinessStatus.PARTIALLY_AVAILABLE,
          notes: 'وصلت أول دفعة وجارٍ اعتماد باقي الكميات.',
        },
        equipment: {
          value: 'رصاصة دكاك + تناكر مياه',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        expectedCost: 70000,
        actualCost: 38000,
      }),
    },
    {
      projectId: projects.adminBuilding.id,
      scheduleId: scheduleByKey.get('admin-apr')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-004',
        nameAr: 'حديد تسليح القواعد',
        category: 'CIVIL',
        location: 'القواعد المنفصلة',
        status: ActivityStatus.IN_PROGRESS,
        lookaheadStatus: LookaheadStatus.IN_PROGRESS,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-04-20',
        plannedEnd: '2026-04-30',
        actualStart: '2026-04-20',
        progressPercent: 55,
        labor: {
          value: '6 حدادين + 2 مساعدين',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        materials: {
          value: 'حديد D16 و D20 + كانات',
          status: RequirementReadinessStatus.REQUESTED,
          notes: 'الشحنة الثانية قيد التخليص.',
        },
        expectedCost: 185000,
        actualCost: 92000,
      }),
    },
    {
      projectId: projects.adminBuilding.id,
      scheduleId: scheduleByKey.get('admin-apr')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-005',
        nameAr: 'شدات خشبية للقواعد',
        category: 'CIVIL',
        location: 'القواعد والميدات',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.READY,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-04-27',
        plannedEnd: '2026-05-02',
        progressPercent: 0,
        labor: {
          value: '4 نجارين + 2 مساعدين',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        materials: {
          value: 'خشب موسكي + زيت شدة',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        expectedCost: 95000,
      }),
    },
    {
      projectId: projects.adminBuilding.id,
      scheduleId: scheduleByKey.get('admin-may')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-006',
        nameAr: 'صب خرسانة القواعد',
        category: 'CIVIL',
        location: 'القواعد الرئيسية',
        status: ActivityStatus.BLOCKED,
        lookaheadStatus: LookaheadStatus.BLOCKED,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-04-29',
        plannedEnd: '2026-05-01',
        progressPercent: 0,
        blockerReason: 'المضخة غير مؤكدة والتوريد النهائي للخرسانة لم يعتمد بعد.',
        materials: {
          value: 'خرسانة جاهزة C35',
          status: RequirementReadinessStatus.REQUESTED,
          notes: 'بانتظار اعتماد المصنع والخلطة.',
        },
        equipment: {
          value: 'مضخة خرسانة 52م + هزازات',
          status: RequirementReadinessStatus.BLOCKED,
          notes: 'تم تأجيل الحجز بسبب ضغط المورد.',
        },
        expectedCost: 210000,
      }),
    },
    {
      projectId: projects.adminBuilding.id,
      scheduleId: scheduleByKey.get('admin-may')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-007',
        nameAr: 'عزل القواعد',
        category: 'FINISHING',
        location: 'القواعد والميدات',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.PLANNED,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-05-03',
        plannedEnd: '2026-05-06',
        progressPercent: 0,
        materials: {
          value: 'رولات بيتومين + برايمر',
          status: RequirementReadinessStatus.PENDING,
        },
        expectedCost: 65000,
      }),
    },
    {
      projectId: projects.adminBuilding.id,
      scheduleId: scheduleByKey.get('admin-may')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-008',
        nameAr: 'أعمال كهرباء تأسيسية للبدروم',
        category: 'ELECTRICAL',
        location: 'البدروم الأول',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.READY,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-05-04',
        plannedEnd: '2026-05-12',
        progressPercent: 0,
        labor: {
          value: '3 كهربائيين',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        materials: {
          value: 'مواسير PVC + صناديق سحب',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        expectedCost: 110000,
      }),
    },
    {
      projectId: projects.adminBuilding.id,
      scheduleId: scheduleByKey.get('admin-may')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-009',
        nameAr: 'أعمال سباكة تأسيسية للبدروم',
        category: 'MECHANICAL',
        location: 'غرف الخدمات',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.PLANNED,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-05-05',
        plannedEnd: '2026-05-13',
        progressPercent: 0,
        materials: {
          value: 'مواسير UPVC + قطع ربط',
          status: RequirementReadinessStatus.REQUESTED,
          notes: 'المورد أكد التسليم مطلع الأسبوع القادم.',
        },
        expectedCost: 98000,
      }),
    },
    {
      projectId: projects.adminBuilding.id,
      scheduleId: scheduleByKey.get('admin-may')!,
      responsibleUserId: demoUsers.rashed.id,
      ...buildActivitySeedData({
        code: 'ACT-010',
        nameAr: 'استلام استشاري لأعمال القواعد',
        category: 'OTHER',
        location: 'منطقة القواعد',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.READY,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-05-02',
        plannedEnd: '2026-05-02',
        progressPercent: 0,
        notes: 'يتطلب تجهيز مستندات الجودة ومحاضر الصب.',
        requiresApproval: true,
        approvalStatus: ApprovalStatus.PENDING,
      }),
    },

    {
      projectId: projects.labs.id,
      scheduleId: scheduleByKey.get('labs-apr')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-001',
        nameAr: 'تجهيز موقع المختبرات ومكتب الإدارة',
        category: 'ADMIN',
        location: 'ساحة الخدمات',
        status: ActivityStatus.COMPLETED,
        lookaheadStatus: LookaheadStatus.DONE,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-04-04',
        plannedEnd: '2026-04-06',
        actualStart: '2026-04-04',
        actualEnd: '2026-04-05',
        progressPercent: 100,
        expectedCost: 35000,
        actualCost: 34000,
      }),
    },
    {
      projectId: projects.labs.id,
      scheduleId: scheduleByKey.get('labs-apr')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-002',
        nameAr: 'أعمال حفر خنادق الخدمات',
        category: 'CIVIL',
        location: 'المسار الشرقي',
        status: ActivityStatus.IN_PROGRESS,
        lookaheadStatus: LookaheadStatus.IN_PROGRESS,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-04-17',
        plannedEnd: '2026-04-29',
        actualStart: '2026-04-17',
        progressPercent: 47,
        equipment: {
          value: 'حفار صغير + لودر',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        expectedCost: 88000,
        actualCost: 41000,
      }),
    },
    {
      projectId: projects.labs.id,
      scheduleId: scheduleByKey.get('labs-apr')!,
      responsibleUserId: demoUsers.sara.id,
      ...buildActivitySeedData({
        code: 'ACT-003',
        nameAr: 'توريد حديد تسليح الميدات',
        category: 'PROCUREMENT',
        location: 'منطقة الميدات',
        status: ActivityStatus.BLOCKED,
        lookaheadStatus: LookaheadStatus.BLOCKED,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-04-26',
        plannedEnd: '2026-04-30',
        progressPercent: 0,
        blockerReason: 'لم يتم تأكيد كميات الحديد النهائية من المورد.',
        materials: {
          value: 'حديد D12 و D16 للميدات',
          status: RequirementReadinessStatus.BLOCKED,
          notes: 'المورد طلب إعادة جدولة الدفعة الأولى.',
        },
        expectedCost: 240000,
      }),
    },
    {
      projectId: projects.labs.id,
      scheduleId: scheduleByKey.get('labs-may')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-004',
        nameAr: 'شدات خشبية للميدات',
        category: 'CIVIL',
        location: 'الواجهة الشمالية',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.PLANNED,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-05-01',
        plannedEnd: '2026-05-05',
        progressPercent: 0,
        materials: {
          value: 'خشب شدة + شدادات',
          status: RequirementReadinessStatus.REQUESTED,
        },
        expectedCost: 90000,
      }),
    },
    {
      projectId: projects.labs.id,
      scheduleId: scheduleByKey.get('labs-may')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-005',
        nameAr: 'صب خرسانة الميدات',
        category: 'CIVIL',
        location: 'المبنى B',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.PLANNED,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-05-06',
        plannedEnd: '2026-05-09',
        progressPercent: 0,
        materials: {
          value: 'خرسانة C30 + إضافات مقاومة',
          status: RequirementReadinessStatus.PENDING,
        },
        equipment: {
          value: 'مضخة خرسانة + هزازات',
          status: RequirementReadinessStatus.REQUESTED,
        },
        expectedCost: 175000,
      }),
    },
    {
      projectId: projects.labs.id,
      scheduleId: scheduleByKey.get('labs-may')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-006',
        nameAr: 'تمديدات كهرباء أولية للمختبرات',
        category: 'ELECTRICAL',
        location: 'مبنى المختبرات',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.READY,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-05-03',
        plannedEnd: '2026-05-12',
        progressPercent: 0,
        labor: {
          value: '3 كهربائيين + فني سحب',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        materials: {
          value: 'مواسير GI + سلالم كابلات',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        expectedCost: 76000,
      }),
    },
    {
      projectId: projects.labs.id,
      scheduleId: scheduleByKey.get('labs-may')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-007',
        nameAr: 'تمديدات سباكة أرضية',
        category: 'MECHANICAL',
        location: 'المسار الجنوبي',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.PLANNED,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-05-04',
        plannedEnd: '2026-05-11',
        progressPercent: 0,
        materials: {
          value: 'مواسير HDPE + غرف تفتيش',
          status: RequirementReadinessStatus.REQUESTED,
        },
        expectedCost: 69000,
      }),
    },

    {
      projectId: projects.camp.id,
      scheduleId: scheduleByKey.get('camp-apr')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-001',
        nameAr: 'تجهيز الموقع وتسوير مؤقت',
        category: 'ADMIN',
        location: 'المحيط العام',
        status: ActivityStatus.COMPLETED,
        lookaheadStatus: LookaheadStatus.DONE,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-04-10',
        plannedEnd: '2026-04-13',
        actualStart: '2026-04-10',
        actualEnd: '2026-04-12',
        progressPercent: 100,
        expectedCost: 25000,
        actualCost: 23000,
      }),
    },
    {
      projectId: projects.camp.id,
      scheduleId: scheduleByKey.get('camp-apr')!,
      responsibleUserId: demoUsers.rashed.id,
      ...buildActivitySeedData({
        code: 'ACT-002',
        nameAr: 'توريد كونتينرات السكن',
        category: 'PROCUREMENT',
        location: 'منطقة السكن',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.PLANNED,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-04-24',
        plannedEnd: '2026-04-30',
        progressPercent: 0,
        materials: {
          value: '6 كونتينرات سكنية مجهزة',
          status: RequirementReadinessStatus.REQUESTED,
          notes: 'تم اعتماد المورد وجارٍ ترتيب النقل.',
        },
        expectedCost: 145000,
      }),
    },
    {
      projectId: projects.camp.id,
      scheduleId: scheduleByKey.get('camp-may')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-003',
        nameAr: 'أعمال عزل خزان الصرف',
        category: 'FINISHING',
        location: 'الخزان الأرضي',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.READY,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-05-02',
        plannedEnd: '2026-05-05',
        progressPercent: 0,
        materials: {
          value: 'مواد عزل إسمنتي مرن',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        expectedCost: 40000,
      }),
    },
    {
      projectId: projects.camp.id,
      scheduleId: scheduleByKey.get('camp-apr')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-004',
        nameAr: 'تمديدات كهرباء مؤقتة',
        category: 'ELECTRICAL',
        location: 'لوحات التغذية المؤقتة',
        status: ActivityStatus.IN_PROGRESS,
        lookaheadStatus: LookaheadStatus.IN_PROGRESS,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-04-22',
        plannedEnd: '2026-04-29',
        actualStart: '2026-04-22',
        progressPercent: 40,
        materials: {
          value: 'كيابل تغذية + لوحات مؤقتة',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        expectedCost: 28000,
        actualCost: 11000,
      }),
    },
    {
      projectId: projects.camp.id,
      scheduleId: scheduleByKey.get('camp-may')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-005',
        nameAr: 'تشطيبات أولية وغرف الحراسة',
        category: 'FINISHING',
        location: 'المدخل',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.READY,
        priority: LookaheadPriority.LOW,
        plannedStart: '2026-05-06',
        plannedEnd: '2026-05-15',
        progressPercent: 0,
        labor: {
          value: '2 معلمين دهان + 1 نجار',
          status: RequirementReadinessStatus.AVAILABLE,
        },
      }),
    },

    {
      projectId: projects.servicesHub.id,
      scheduleId: scheduleByKey.get('services-apr')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-001',
        nameAr: 'تجهيز الموقع وغرف الخدمات المؤقتة',
        category: 'ADMIN',
        location: 'المدخل الشرقي',
        status: ActivityStatus.COMPLETED,
        lookaheadStatus: LookaheadStatus.DONE,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-04-08',
        plannedEnd: '2026-04-10',
        actualStart: '2026-04-08',
        actualEnd: '2026-04-10',
        progressPercent: 100,
        expectedCost: 32000,
        actualCost: 30000,
      }),
    },
    {
      projectId: projects.servicesHub.id,
      scheduleId: scheduleByKey.get('services-apr')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-002',
        nameAr: 'خرسانة نظافة لغرف الخدمات',
        category: 'CIVIL',
        location: 'غرف الخدمات A و B',
        status: ActivityStatus.COMPLETED,
        lookaheadStatus: LookaheadStatus.DONE,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-04-11',
        plannedEnd: '2026-04-14',
        actualStart: '2026-04-11',
        actualEnd: '2026-04-15',
        progressPercent: 100,
        expectedCost: 145000,
        actualCost: 156000,
      }),
    },
    {
      projectId: projects.servicesHub.id,
      scheduleId: scheduleByKey.get('services-apr')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-003',
        nameAr: 'قواعد وأعمدة غرف الخدمات',
        category: 'CIVIL',
        location: 'غرف الخدمات الرئيسية',
        status: ActivityStatus.IN_PROGRESS,
        lookaheadStatus: LookaheadStatus.IN_PROGRESS,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-04-16',
        plannedEnd: '2026-04-30',
        actualStart: '2026-04-16',
        progressPercent: 78,
        labor: {
          value: '7 حدادين + 4 نجارين',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        materials: {
          value: 'حديد تسليح وقوالب معدنية',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        expectedCost: 560000,
        actualCost: 612000,
      }),
    },
    {
      projectId: projects.servicesHub.id,
      scheduleId: scheduleByKey.get('services-may')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-004',
        nameAr: 'تحويل مسارات MEP داخل غرف الخدمات',
        category: 'MEP',
        location: 'ممرات الخدمات والغرف الفنية',
        status: ActivityStatus.DELAYED,
        lookaheadStatus: LookaheadStatus.IN_PROGRESS,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-04-24',
        plannedEnd: '2026-05-05',
        actualStart: '2026-04-24',
        progressPercent: 62,
        blockerReason: 'ملاحظات الاستشاري على مسارات الكابلات وخطوط المياه فرضت إعادة توزيع جزئية.',
        labor: {
          value: '3 فنيي كهرباء + 2 فنيي ميكانيكا',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        materials: {
          value: 'صواني كابلات ومواسير مجلفنة وصمامات',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        equipment: {
          value: 'رافعة مقصية وأجهزة لحام',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        expectedCost: 280000,
        actualCost: 325000,
        notes: 'العمل مستمر لكن التكلفة ارتفعت نتيجة التعديلات وإعادة التنفيذ في جزء من المسار.',
      }),
    },
    {
      projectId: projects.servicesHub.id,
      scheduleId: scheduleByKey.get('services-may')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-005',
        nameAr: 'قواعد سطح الخدمات وحوامل المعدات',
        category: 'MECHANICAL',
        location: 'سطح الخدمات',
        status: ActivityStatus.NOT_STARTED,
        lookaheadStatus: LookaheadStatus.READY,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-05-07',
        plannedEnd: '2026-05-14',
        progressPercent: 0,
        materials: {
          value: 'قواعد معدنية وحوامل ميكانيكية',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        expectedCost: 175000,
      }),
    },

    {
      projectId: projects.maintenance.id,
      scheduleId: scheduleByKey.get('maint-mar')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-001',
        nameAr: 'تجهيز موقع الصيانة',
        category: 'ADMIN',
        location: 'مدخل المبنى',
        status: ActivityStatus.COMPLETED,
        lookaheadStatus: LookaheadStatus.DONE,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-01-09',
        plannedEnd: '2026-01-12',
        actualStart: '2026-01-09',
        actualEnd: '2026-01-11',
        progressPercent: 100,
        expectedCost: 12000,
        actualCost: 11500,
      }),
    },
    {
      projectId: projects.maintenance.id,
      scheduleId: scheduleByKey.get('maint-mar')!,
      responsibleUserId: demoUsers.mariam.id,
      ...buildActivitySeedData({
        code: 'ACT-002',
        nameAr: 'عزل سطح الخدمات',
        category: 'FINISHING',
        location: 'السطح',
        status: ActivityStatus.COMPLETED,
        lookaheadStatus: LookaheadStatus.DONE,
        priority: LookaheadPriority.HIGH,
        plannedStart: '2026-02-14',
        plannedEnd: '2026-02-19',
        actualStart: '2026-02-14',
        actualEnd: '2026-02-19',
        progressPercent: 100,
        materials: {
          value: 'رولات عزل + حماية أسمنتية',
          status: RequirementReadinessStatus.AVAILABLE,
        },
        expectedCost: 54000,
        actualCost: 52000,
      }),
    },
    {
      projectId: projects.maintenance.id,
      scheduleId: scheduleByKey.get('maint-mar')!,
      responsibleUserId: demoUsers.ali.id,
      ...buildActivitySeedData({
        code: 'ACT-003',
        nameAr: 'تشطيبات أولية وغرف الخدمات',
        category: 'FINISHING',
        location: 'الدور الأرضي',
        status: ActivityStatus.COMPLETED,
        lookaheadStatus: LookaheadStatus.DONE,
        priority: LookaheadPriority.MEDIUM,
        plannedStart: '2026-03-05',
        plannedEnd: '2026-03-24',
        actualStart: '2026-03-05',
        actualEnd: '2026-03-23',
        progressPercent: 100,
        expectedCost: 98000,
        actualCost: 96500,
      }),
    },
  ];

  const activityMap = new Map<string, { id: string; projectId: string }>();
  for (const activity of activitySeeds) {
    const created = await prisma.operationActivity.create({
      data: {
        ...activity,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
      select: { id: true, code: true, projectId: true },
    });
    activityMap.set(`${created.projectId}:${created.code}`, { id: created.id, projectId: created.projectId });
  }

  const costItems = [
    { projectId: projects.adminBuilding.id, code: 'COST-001', nameAr: 'أعمال مدنية', category: 'CIVIL', totalCost: 4200000 },
    { projectId: projects.adminBuilding.id, code: 'COST-002', nameAr: 'أعمال كهرباء وميكانيكا', category: 'MEP', totalCost: 2150000 },
    { projectId: projects.adminBuilding.id, code: 'COST-003', nameAr: 'تجهيزات ومصاريف موقع', category: 'PRELIMINARIES', totalCost: 680000 },
    { projectId: projects.labs.id, code: 'COST-001', nameAr: 'أعمال خرسانية', category: 'CIVIL', totalCost: 2950000 },
    { projectId: projects.labs.id, code: 'COST-002', nameAr: 'خدمات وكهروميكانيك', category: 'MEP', totalCost: 1880000 },
    { projectId: projects.camp.id, code: 'COST-001', nameAr: 'توريد وتجهيز الموقع', category: 'PRELIMINARIES', totalCost: 410000 },
    { projectId: projects.camp.id, code: 'COST-002', nameAr: 'أعمال كهرباء مؤقتة', category: 'ELECTRICAL', totalCost: 95000 },
    { projectId: projects.servicesHub.id, code: 'COST-001', nameAr: 'أعمال مدنية وغرف الخدمات', category: 'CIVIL', totalCost: 1450000 },
    { projectId: projects.servicesHub.id, code: 'COST-002', nameAr: 'تحويلات وأعمال MEP', category: 'MEP', totalCost: 1550000 },
    { projectId: projects.servicesHub.id, code: 'COST-003', nameAr: 'تجهيزات سطح الخدمات', category: 'PRELIMINARIES', totalCost: 520000 },
    { projectId: projects.maintenance.id, code: 'COST-001', nameAr: 'أعمال صيانة وتشطيب', category: 'FINISHING', totalCost: 185000 },
  ];

  for (const item of costItems) {
    await prisma.costItem.upsert({
      where: {
        projectId_code: {
          projectId: item.projectId,
          code: item.code,
        },
      },
      update: {
        nameAr: item.nameAr,
        category: item.category,
        unit: 'LS',
        quantity: 1,
        unitCost: item.totalCost,
        totalCost: item.totalCost,
        currency: 'SAR',
      },
      create: {
        projectId: item.projectId,
        code: item.code,
        nameAr: item.nameAr,
        nameEn: null,
        category: item.category,
        unit: 'LS',
        quantity: 1,
        unitCost: item.totalCost,
        totalCost: item.totalCost,
        currency: 'SAR',
      },
    });
  }

  const buildPendingSteps = (): Array<{
    stage: PRApprovalStage;
    status: ApprovalStepStatus;
    actorId: string | null;
    decidedAt: Date | null;
    note: string | null;
  }> => [
    { stage: 'PROCUREMENT_REVIEW', status: ApprovalStepStatus.PENDING, actorId: null, decidedAt: null, note: null },
    { stage: 'COST_REVIEW', status: ApprovalStepStatus.PENDING, actorId: null, decidedAt: null, note: null },
    { stage: 'PM_REVIEW', status: ApprovalStepStatus.PENDING, actorId: null, decidedAt: null, note: null },
    { stage: 'FINAL_REVIEW', status: ApprovalStepStatus.PENDING, actorId: null, decidedAt: null, note: null },
  ];

  const purchaseRequests = [
    {
      prNumber: 'PR-2026-001',
      projectId: projects.adminBuilding.id,
      activityId: activityMap.get(projects.adminBuilding.id + ':ACT-005')?.id ?? null,
      nameAr: 'توريد حديد تسليح للقواعد والأعمدة',
      nameEn: 'Rebar Supply for Foundations and Columns',
      description: 'طلب توريد عاجل لحديد التسليح للدفعة الأولى من القواعد والأعمدة قبل بدء الصب.',
      requirementType: 'MATERIALS',
      priority: LookaheadPriority.HIGH,
      status: PRStatus.SUBMITTED,
      currentStage: 'PROCUREMENT_REVIEW',
      quantity: 78,
      unit: 'طن',
      totalAmount: 236500,
      vendor: 'شركة الحديد الوطنية',
      expectedDeliveryDate: d('2026-05-03'),
      requestedById: demoUsers.ali.id,
      requestedAt: d('2026-04-24'),
      notes: 'الطلب تم إنشاؤه وإرساله مباشرة. مطلوب تأكيد جدول التوريد اليوم.',
      approvalNote: null,
      approvedById: null,
      approvedAt: null,
      items: [
        { titleAr: 'حديد تسليح قطر 16 مم', titleEn: '16 mm Rebar', description: 'للقواعد الرئيسية', quantity: 42, unit: 'طن', unitPrice: 3050, estimatedTotal: 128100, approvedQuantity: null, approvedUnitPrice: null, approvedTotal: null, notes: 'تسليم على دفعتين' },
        { titleAr: 'حديد تسليح قطر 12 مم', titleEn: '12 mm Rebar', description: 'للأعمدة والكانات', quantity: 36, unit: 'طن', unitPrice: 3011.11, estimatedTotal: 108400, approvedQuantity: null, approvedUnitPrice: null, approvedTotal: null, notes: 'مطابقة لمواصفة المشروع' },
      ],
      approvalSteps: buildPendingSteps(),
    },
    {
      prNumber: 'PR-2026-002',
      projectId: projects.adminBuilding.id,
      activityId: activityMap.get(projects.adminBuilding.id + ':ACT-006')?.id ?? null,
      nameAr: 'معدات رفع وسقالة محيطية للواجهة الشرقية',
      nameEn: 'Lifting Equipment and Perimeter Scaffolding',
      description: 'تأجير معدات رفع وسقالات للوصول إلى الواجهة الشرقية أثناء أعمال الشدات.',
      requirementType: 'EQUIPMENT',
      priority: LookaheadPriority.MEDIUM,
      status: PRStatus.UNDER_REVIEW,
      currentStage: 'COST_REVIEW',
      quantity: 1,
      unit: 'حزمة',
      totalAmount: 84500,
      vendor: 'مؤسسة المعدات الثقيلة السعودية',
      expectedDeliveryDate: d('2026-05-06'),
      requestedById: demoUsers.rashed.id,
      requestedAt: d('2026-04-22'),
      notes: 'تمت مراجعة المشتريات وجارٍ تدقيق تسعيرة التأجير.',
      approvalNote: null,
      approvedById: null,
      approvedAt: null,
      items: [
        { titleAr: 'رافعة مقصية', titleEn: 'Scissor Lift', description: 'استخدام لمدة 14 يومًا', quantity: 2, unit: 'وحدة', unitPrice: 12500, estimatedTotal: 25000, approvedQuantity: 2, approvedUnitPrice: 12000, approvedTotal: 24000, notes: 'تم تخفيض السعر بعد التفاوض' },
        { titleAr: 'سقالة محيطية', titleEn: 'Perimeter Scaffolding', description: 'توريد وتركيب', quantity: 1, unit: 'حزمة', unitPrice: 59500, estimatedTotal: 59500, approvedQuantity: 1, approvedUnitPrice: 59500, approvedTotal: 59500, notes: 'تشمل التركيب والفك' },
      ],
      approvalSteps: [
        { stage: 'PROCUREMENT_REVIEW', status: 'APPROVED' as const, actorId: demoUsers.noura.id, decidedAt: d('2026-04-23'), note: 'تمت مراجعة الموردين وتأكيد أفضل عرض فني.' },
        ...buildPendingSteps().slice(1),
      ],
    },
    {
      prNumber: 'PR-2026-003',
      projectId: projects.servicesHub.id,
      activityId: activityMap.get(projects.servicesHub.id + ':ACT-004')?.id ?? null,
      nameAr: 'كابلات كهرباء وصواني لمسارات MEP',
      nameEn: 'Electrical Cables and Trays for MEP Routes',
      description: 'توريد كابلات رئيسية وصواني مجلفنة لمعالجة تعديل مسارات الخدمات داخل غرف الخدمات.',
      requirementType: 'MATERIALS',
      priority: LookaheadPriority.HIGH,
      status: PRStatus.PENDING_APPROVAL,
      currentStage: 'PM_REVIEW',
      quantity: 640,
      unit: 'م.ط',
      totalAmount: 154000,
      vendor: 'شركة التجهيزات الكهروميكانيكية الحديثة',
      expectedDeliveryDate: d('2026-05-07'),
      requestedById: demoUsers.mariam.id,
      requestedAt: d('2026-04-23'),
      notes: 'الطلب مرتبط مباشرة بتأخير نشاط MEP ويتطلب اعتماد مدير المشروع.',
      approvalNote: null,
      approvedById: null,
      approvedAt: null,
      items: [
        { titleAr: 'صواني كابلات مجلفنة', titleEn: 'Galvanized Cable Trays', description: 'مقاسات 200 و300 مم', quantity: 240, unit: 'م.ط', unitPrice: 125, estimatedTotal: 30000, approvedQuantity: 240, approvedUnitPrice: 118, approvedTotal: 28320, notes: 'مطابقة لاعتماد الاستشاري' },
        { titleAr: 'كابلات تغذية نحاس', titleEn: 'Copper Power Cables', description: 'مسارات رئيسية', quantity: 400, unit: 'م.ط', unitPrice: 310, estimatedTotal: 124000, approvedQuantity: 400, approvedUnitPrice: 302, approvedTotal: 120800, notes: 'تم اعتماد بديل مكافئ فنيًا' },
      ],
      approvalSteps: [
        { stage: 'PROCUREMENT_REVIEW', status: 'APPROVED' as const, actorId: demoUsers.noura.id, decidedAt: d('2026-04-24'), note: 'تم التأكد من توافر المورد وخطة التسليم.' },
        { stage: 'COST_REVIEW', status: 'APPROVED' as const, actorId: demoUsers.yousef.id, decidedAt: d('2026-04-25'), note: 'الأسعار ضمن الموازنة بعد خصم 3.5%.' },
        ...buildPendingSteps().slice(2),
      ],
    },
    {
      prNumber: 'PR-2026-004',
      projectId: projects.servicesHub.id,
      activityId: activityMap.get(projects.servicesHub.id + ':ACT-005')?.id ?? null,
      nameAr: 'مضخات وخزانات خدمة لسطح الخدمات',
      nameEn: 'Service Pumps and Tanks for Service Roof',
      description: 'توريد حزمة مضخات وخزانين مع ملحقات التشغيل لغرف الخدمات وسطح الخدمات.',
      requirementType: 'EQUIPMENT',
      priority: LookaheadPriority.MEDIUM,
      status: PRStatus.PENDING_APPROVAL,
      currentStage: 'FINAL_REVIEW',
      quantity: 1,
      unit: 'حزمة',
      totalAmount: 184500,
      vendor: 'مؤسسة حلول الضخ والتحكم',
      expectedDeliveryDate: d('2026-05-09'),
      requestedById: demoUsers.sara.id,
      requestedAt: d('2026-04-21'),
      notes: 'الطلب اجتاز المراجعات التنفيذية وينتظر الاعتماد النهائي.',
      approvalNote: null,
      approvedById: null,
      approvedAt: null,
      items: [
        { titleAr: 'مضخة خدمة رئيسية', titleEn: 'Main Service Pump', description: 'مع لوحة تحكم', quantity: 2, unit: 'وحدة', unitPrice: 38500, estimatedTotal: 77000, approvedQuantity: 2, approvedUnitPrice: 37250, approvedTotal: 74500, notes: 'شامل الاختبارات الأولية' },
        { titleAr: 'خزان FRP', titleEn: 'FRP Tank', description: 'سعة 15 م3', quantity: 2, unit: 'وحدة', unitPrice: 53750, estimatedTotal: 107500, approvedQuantity: 2, approvedUnitPrice: 52000, approvedTotal: 104000, notes: 'مع قواعد ومستلزمات تركيب' },
      ],
      approvalSteps: [
        { stage: 'PROCUREMENT_REVIEW', status: 'APPROVED' as const, actorId: demoUsers.noura.id, decidedAt: d('2026-04-22'), note: 'تمت مراجعة عروض الموردين واختيار العرض الأفضل.' },
        { stage: 'COST_REVIEW', status: 'APPROVED' as const, actorId: demoUsers.yousef.id, decidedAt: d('2026-04-23'), note: 'القيمة ضمن الحد المعتمد للمشروع.' },
        { stage: 'PM_REVIEW', status: 'APPROVED' as const, actorId: demoUsers.sara.id, decidedAt: d('2026-04-24'), note: 'تمت الموافقة تنفيذياً لارتباطها بخطة التشغيل.' },
        ...buildPendingSteps().slice(3),
      ],
    },
    {
      prNumber: 'PR-2026-005',
      projectId: projects.maintenance.id,
      activityId: activityMap.get(projects.maintenance.id + ':ACT-002')?.id ?? null,
      nameAr: 'مواد عزل وسداد لفواصل سطح الخدمات',
      nameEn: 'Waterproofing Materials for Service Roof',
      description: 'توريد مواد عزل مرن وسداد لفواصل التمدد ضمن أعمال الصيانة النهائية.',
      requirementType: 'MATERIALS',
      priority: LookaheadPriority.MEDIUM,
      status: PRStatus.APPROVED,
      currentStage: 'COMPLETED',
      quantity: 1450,
      unit: 'م²',
      totalAmount: 96500,
      vendor: 'شركة المواد العازلة المتقدمة',
      expectedDeliveryDate: d('2026-04-18'),
      actualDeliveryDate: d('2026-04-17'),
      requestedById: demoUsers.ali.id,
      requestedAt: d('2026-04-10'),
      notes: 'سلسلة اعتماد مكتملة وتم التوريد طبقًا للخطة.',
      approvalNote: 'اعتماد نهائي مع توجيه بسرعة التنفيذ قبل إغلاق المشروع.',
      approvedById: adminUser.id,
      approvedAt: d('2026-04-14'),
      items: [
        { titleAr: 'رولات عزل بيتوميني', titleEn: 'Bituminous Waterproofing Rolls', description: 'سماكة 4 مم', quantity: 1200, unit: 'م²', unitPrice: 48, estimatedTotal: 57600, approvedQuantity: 1200, approvedUnitPrice: 46, approvedTotal: 55200, notes: 'اعتماد مواصفة BASF' },
        { titleAr: 'مواد سداد فواصل', titleEn: 'Joint Sealant Materials', description: 'لفواصل التمدد', quantity: 250, unit: 'م.ط', unitPrice: 155.6, estimatedTotal: 38900, approvedQuantity: 250, approvedUnitPrice: 149.2, approvedTotal: 37300, notes: 'مع برايمر مخصص' },
      ],
      approvalSteps: [
        { stage: 'PROCUREMENT_REVIEW', status: 'APPROVED' as const, actorId: demoUsers.noura.id, decidedAt: d('2026-04-11'), note: 'تم اعتماد المورد بعد مقارنة فنية وسعرية.' },
        { stage: 'COST_REVIEW', status: 'APPROVED' as const, actorId: demoUsers.yousef.id, decidedAt: d('2026-04-12'), note: 'تم خفض القيمة الإجمالية 4,000 ريال.' },
        { stage: 'PM_REVIEW', status: 'APPROVED' as const, actorId: demoUsers.sara.id, decidedAt: d('2026-04-13'), note: 'تمت الموافقة لتأثيرها المباشر على التسليم النهائي.' },
        { stage: 'FINAL_REVIEW', status: 'APPROVED' as const, actorId: adminUser.id, decidedAt: d('2026-04-14'), note: 'اعتماد نهائي وإغلاق المسار.' },
      ],
    },
    {
      prNumber: 'PR-2026-006',
      projectId: projects.adminBuilding.id,
      activityId: activityMap.get(projects.adminBuilding.id + ':ACT-007')?.id ?? null,
      nameAr: 'شدات خشبية إضافية للدور الأرضي',
      nameEn: 'Additional Timber Formwork for Ground Floor',
      description: 'طلب شدات خشبية إضافية بعد تعديل مساحات الصب في الواجهة الشمالية.',
      requirementType: 'MATERIALS',
      priority: LookaheadPriority.MEDIUM,
      status: PRStatus.REJECTED,
      currentStage: 'REJECTED',
      quantity: 980,
      unit: 'م²',
      totalAmount: 74200,
      vendor: 'مؤسسة الخشب الصناعي',
      expectedDeliveryDate: d('2026-05-04'),
      requestedById: demoUsers.ali.id,
      requestedAt: d('2026-04-20'),
      notes: 'تم رفض الطلب لحين اعتماد المساحات النهائية.',
      approvalNote: 'الطلب مرفوض لأن الكميات غير مدعومة بمخطط محدث معتمد.',
      approvedById: null,
      approvedAt: null,
      items: [
        { titleAr: 'ألواح شدة خشبية', titleEn: 'Timber Formwork Panels', description: 'سماكة 18 مم', quantity: 980, unit: 'م²', unitPrice: 68, estimatedTotal: 66640, approvedQuantity: null, approvedUnitPrice: null, approvedTotal: null, notes: 'الكميات تحتاج مراجعة هندسية' },
        { titleAr: 'إكسسوارات تثبيت', titleEn: 'Fixing Accessories', description: 'مستلزمات تركيب', quantity: 1, unit: 'حزمة', unitPrice: 7560, estimatedTotal: 7560, approvedQuantity: null, approvedUnitPrice: null, approvedTotal: null, notes: 'تُطلب لاحقًا عند إعادة التقديم' },
      ],
      approvalSteps: [
        { stage: 'PROCUREMENT_REVIEW', status: 'REJECTED' as const, actorId: demoUsers.noura.id, decidedAt: d('2026-04-21'), note: 'الطلب يحتاج مخططًا محدثًا وكشف كميات معتمدًا قبل المضي.' },
        ...buildPendingSteps().slice(1),
      ],
    },
    {
      prNumber: 'PR-2026-007',
      projectId: projects.servicesHub.id,
      activityId: activityMap.get(projects.servicesHub.id + ':ACT-004')?.id ?? null,
      nameAr: 'معدات رفع إضافية لأعمال MEP',
      nameEn: 'Additional Lifting Equipment for MEP Works',
      description: 'تأجير رافعتين إضافيتين وأجهزة لحام بسبب تعديل مسارات الخدمات.',
      requirementType: 'EQUIPMENT',
      priority: LookaheadPriority.HIGH,
      status: PRStatus.REJECTED,
      currentStage: 'REJECTED',
      quantity: 1,
      unit: 'حزمة',
      totalAmount: 132000,
      vendor: 'شركة حلول الرفع المتخصص',
      expectedDeliveryDate: d('2026-05-08'),
      requestedById: demoUsers.mariam.id,
      requestedAt: d('2026-04-23'),
      notes: 'تم رفضه في مراجعة التكاليف واقتراح بديل أقل كلفة.',
      approvalNote: 'القيمة أعلى من الحد المسموح وتم طلب إعادة طرح بديل اقتصادي.',
      approvedById: null,
      approvedAt: null,
      items: [
        { titleAr: 'رافعة مقصية إضافية', titleEn: 'Additional Scissor Lift', description: 'لمسارات غرف الخدمات', quantity: 2, unit: 'وحدة', unitPrice: 24000, estimatedTotal: 48000, approvedQuantity: null, approvedUnitPrice: null, approvedTotal: null, notes: 'يُراجع مع خطة التنفيذ' },
        { titleAr: 'أجهزة لحام وتجهيز', titleEn: 'Welding and Fitting Equipment', description: 'أعمال تعديل المسارات', quantity: 1, unit: 'حزمة', unitPrice: 84000, estimatedTotal: 84000, approvedQuantity: null, approvedUnitPrice: null, approvedTotal: null, notes: 'يتضمن تأجيرًا لمدة 21 يومًا' },
      ],
      approvalSteps: [
        { stage: 'PROCUREMENT_REVIEW', status: 'APPROVED' as const, actorId: demoUsers.noura.id, decidedAt: d('2026-04-24'), note: 'المورد مناسب زمنيًا وتمت مراجعة العرض الفني.' },
        { stage: 'COST_REVIEW', status: 'REJECTED' as const, actorId: demoUsers.yousef.id, decidedAt: d('2026-04-25'), note: 'التكلفة تتجاوز المخصص الحالي ويجب إعادة التفاوض أو تقليل النطاق.' },
        ...buildPendingSteps().slice(2),
      ],
    },
    {
      prNumber: 'PR-2026-008',
      projectId: projects.labs.id,
      activityId: activityMap.get(projects.labs.id + ':ACT-003')?.id ?? null,
      nameAr: 'توريد حديد تسليح للنشاط المتعثر',
      nameEn: 'Rebar Supply for Blocked Activity',
      description: 'طلب شراء مرتبط مباشرة بالنشاط المحجوب بسبب عدم توافر حديد الميدات.',
      requirementType: 'MATERIALS',
      priority: LookaheadPriority.HIGH,
      status: PRStatus.SUBMITTED,
      currentStage: 'PROCUREMENT_REVIEW',
      quantity: 52,
      unit: 'طن',
      totalAmount: 158600,
      vendor: 'شركة الحديد الوطنية',
      expectedDeliveryDate: d('2026-05-02'),
      requestedById: demoUsers.sara.id,
      requestedAt: d('2026-04-26'),
      notes: 'هذا الطلب يفتح النشاط المحجوب ACT-003 إذا تم تأمينه سريعًا.',
      approvalNote: null,
      approvedById: null,
      approvedAt: null,
      items: [
        { titleAr: 'حديد تسليح D12', titleEn: 'D12 Rebar', description: 'للميدات الطرفية', quantity: 22, unit: 'طن', unitPrice: 3040, estimatedTotal: 66880, approvedQuantity: null, approvedUnitPrice: null, approvedTotal: null, notes: 'مرتبط بنشاط محجوب' },
        { titleAr: 'حديد تسليح D16', titleEn: 'D16 Rebar', description: 'للميدات الرئيسية', quantity: 30, unit: 'طن', unitPrice: 3057.33, estimatedTotal: 91720, approvedQuantity: null, approvedUnitPrice: null, approvedTotal: null, notes: 'أولوية قصوى للموقع' },
      ],
      approvalSteps: buildPendingSteps(),
    },
    {
      prNumber: 'PR-2026-009',
      projectId: projects.labs.id,
      activityId: activityMap.get(projects.labs.id + ':ACT-005')?.id ?? null,
      nameAr: 'خرسانة جاهزة عاجلة لصب الميدات',
      nameEn: 'Urgent Ready-Mix Concrete for Grade Beams',
      description: 'طلب عاجل لتأمين خرسانة جاهزة بمجرد إنهاء تجهيزات الميدات.',
      requirementType: 'MATERIALS',
      priority: LookaheadPriority.HIGH,
      status: PRStatus.SUBMITTED,
      currentStage: 'PROCUREMENT_REVIEW',
      quantity: 280,
      unit: 'م³',
      totalAmount: 137200,
      vendor: 'شركة الرياض للخرسانة الجاهزة',
      expectedDeliveryDate: d('2026-05-11'),
      requestedById: demoUsers.mariam.id,
      requestedAt: d('2026-04-27'),
      notes: 'طلب عالي الأولوية ومصنف كعاجل لضمان عدم ضياع نافذة الصب.',
      approvalNote: null,
      approvedById: null,
      approvedAt: null,
      items: [
        { titleAr: 'خرسانة جاهزة C30', titleEn: 'Ready-Mix Concrete C30', description: 'لصب الميدات', quantity: 280, unit: 'م³', unitPrice: 490, estimatedTotal: 137200, approvedQuantity: null, approvedUnitPrice: null, approvedTotal: null, notes: 'يشمل إضافات مقاومة للكبريتات' },
      ],
      approvalSteps: buildPendingSteps(),
    },
    {
      prNumber: 'PR-2026-010',
      projectId: projects.camp.id,
      activityId: activityMap.get(projects.camp.id + ':ACT-004')?.id ?? null,
      nameAr: 'أدوات سلامة ولوحات إرشادية للموقع',
      nameEn: 'Safety Tools and Signage for Site Camp',
      description: 'توريد معدات سلامة أساسية ولوحات إرشادية للممرات والمداخل المؤقتة.',
      requirementType: 'OTHER',
      priority: LookaheadPriority.LOW,
      status: PRStatus.SUBMITTED,
      currentStage: 'PROCUREMENT_REVIEW',
      quantity: 1,
      unit: 'حزمة',
      totalAmount: 12650,
      vendor: 'مؤسسة السلامة المتقدمة',
      expectedDeliveryDate: d('2026-05-01'),
      requestedById: demoUsers.ali.id,
      requestedAt: d('2026-04-25'),
      notes: 'طلب اعتيادي منخفض الأولوية لكنه مطلوب قبل زيارة السلامة الأسبوعية.',
      approvalNote: null,
      approvedById: null,
      approvedAt: null,
      items: [
        { titleAr: 'طفايات حريق', titleEn: 'Fire Extinguishers', description: 'بودرة جافة 6 كجم', quantity: 8, unit: 'وحدة', unitPrice: 275, estimatedTotal: 2200, approvedQuantity: null, approvedUnitPrice: null, approvedTotal: null, notes: 'للمكاتب والكونتينرات' },
        { titleAr: 'لوحات تحذيرية وإرشادية', titleEn: 'Safety Signage', description: 'لوحات للممرات ومخارج الطوارئ', quantity: 1, unit: 'حزمة', unitPrice: 4450, estimatedTotal: 4450, approvedQuantity: null, approvedUnitPrice: null, approvedTotal: null, notes: 'مطابقة لاشتراطات السلامة' },
        { titleAr: 'خوذات وسترات سلامة', titleEn: 'Safety Helmets and Vests', description: 'دفعة إضافية للعمالة الجديدة', quantity: 1, unit: 'حزمة', unitPrice: 6000, estimatedTotal: 6000, approvedQuantity: null, approvedUnitPrice: null, approvedTotal: null, notes: 'للاستخدام الفوري بالموقع' },
      ],
      approvalSteps: buildPendingSteps(),
    },
  ];

  for (const request of purchaseRequests) {
    await prisma.purchaseRequest.create({
      data: {
        prNumber: request.prNumber,
        projectId: request.projectId,
        activityId: request.activityId,
        nameAr: request.nameAr,
        nameEn: request.nameEn,
        description: request.description,
        requirementType: request.requirementType,
        priority: request.priority,
        status: request.status,
        currentStage: request.currentStage as any,
        currency: 'SAR',
        quantity: request.quantity,
        unit: request.unit,
        totalAmount: request.totalAmount,
        vendor: request.vendor,
        expectedDeliveryDate: request.expectedDeliveryDate,
        actualDeliveryDate: request.actualDeliveryDate ?? null,
        requestedById: request.requestedById,
        requestedAt: request.requestedAt,
        approvalNote: request.approvalNote,
        approvedById: request.approvedById,
        approvedAt: request.approvedAt,
        notes: request.notes,
        items: {
          create: request.items.map((item, index) => ({
            lineNumber: index + 1,
            titleAr: item.titleAr,
            titleEn: item.titleEn,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            estimatedTotal: item.estimatedTotal,
            approvedQuantity: item.approvedQuantity,
            approvedUnitPrice: item.approvedUnitPrice,
            approvedTotal: item.approvedTotal,
            notes: item.notes,
          })),
        },
        approvalSteps: {
          create: request.approvalSteps as any,
        },
      },
    });
  }

  // ── Demo Notifications ────────────────────────────────────────────────────
  const adminUsers = await prisma.user.findMany({
    where: { email: { in: ['admin@cdc-system.local', 'rashed.pm@cdc-system.local', 'noura.proc@cdc-system.local'] } },
    select: { id: true, email: true },
  });

  const adminUserObj = adminUsers.find((u) => u.email === 'admin@cdc-system.local');
  const rashedUser = adminUsers.find((u) => u.email === 'rashed.pm@cdc-system.local');
  const nouraUser = adminUsers.find((u) => u.email === 'noura.proc@cdc-system.local');

  await prisma.notification.deleteMany({
    where: { userId: { in: adminUsers.map((u) => u.id) } },
  });

  const notificationDefs = [
    ...(adminUserObj ? [
      { userId: adminUserObj.id, title: 'اعتماد نهائي مكتمل', body: 'مواد عزل وسداد لفواصل سطح الخدمات — PR-2026-005', type: 'SUCCESS', entityType: 'purchase_request', isRead: false },
      { userId: adminUserObj.id, title: 'طلب بانتظار الاعتماد النهائي', body: 'مضخات وخزانات خدمة لسطح الخدمات — PR-2026-004', type: 'INFO', entityType: 'purchase_request', isRead: false },
      { userId: adminUserObj.id, title: 'طلب مرفوض في مراجعة التكاليف', body: 'معدات رفع إضافية لأعمال MEP — PR-2026-007', type: 'WARNING', entityType: 'purchase_request', isRead: true },
      { userId: adminUserObj.id, title: 'طلب مرتبط بنشاط محجوب', body: 'توريد حديد تسليح للنشاط المتعثر — PR-2026-008', type: 'INFO', entityType: 'purchase_request', isRead: true },
    ] : []),
    ...(rashedUser ? [
      { userId: rashedUser.id, title: 'تمت مراجعة المشتريات والطلب لدى التكاليف', body: 'معدات رفع وسقالة محيطية للواجهة الشرقية — PR-2026-002', type: 'INFO', entityType: 'purchase_request', isRead: false },
      { userId: rashedUser.id, title: 'اعتماد مطلوب لطلب جديد بالمشروع', body: 'كابلات كهرباء وصواني لمسارات MEP — PR-2026-003', type: 'INFO', entityType: 'purchase_request', isRead: true },
    ] : []),
    ...(nouraUser ? [
      { userId: nouraUser.id, title: 'طلب شراء جديد يحتاج مراجعة', body: 'توريد حديد تسليح للقواعد والأعمدة — PR-2026-001', type: 'INFO', entityType: 'purchase_request', isRead: false },
      { userId: nouraUser.id, title: 'طلب عاجل بانتظار مراجعة المشتريات', body: 'خرسانة جاهزة عاجلة لصب الميدات — PR-2026-009', type: 'INFO', entityType: 'purchase_request', isRead: true },
    ] : []),
  ];

  if (notificationDefs.length > 0) {
    await prisma.notification.createMany({
      data: notificationDefs.map((n) => ({
        userId: n.userId,
        title: n.title,
        body: n.body,
        type: n.type as any,
        isRead: n.isRead,
        entityType: n.entityType,
        route: '/procurement',
      })),
    });
  }

  const dailyLogs = [
    {
      projectId: projects.adminBuilding.id,
      date: '2026-04-21',
      summary: 'استمرار تجهيز حديد القواعد مع إنهاء أجزاء من الدفان.',
      completedWork: 'إنهاء 60% من حديد القواعد بالمحاور A-B واستكمال دفان المنطقة الجنوبية.',
      workedActivitiesSummary: 'ACT-003, ACT-004',
      blockers: 'تأخر وصول الشحنة الثانية من الحديد.',
      tomorrowPlan: 'استكمال الحدادة ورفع الشدات للجزء الأول.',
      createdById: demoUsers.ali.id,
      relatedCodes: ['ACT-003', 'ACT-004'],
    },
    {
      projectId: projects.adminBuilding.id,
      date: '2026-04-22',
      summary: 'تقدم جيد في الحدادة والشدات.',
      completedWork: 'استكمال شدات القواعد الخارجية وإقفال الدفان النهائي بالمحور C.',
      workedActivitiesSummary: 'ACT-003, ACT-004, ACT-005',
      blockers: 'بانتظار اعتماد مصنع الخرسانة.',
      tomorrowPlan: 'مراجعة الحصر النهائي وطلب الخرسانة.',
      createdById: demoUsers.mariam.id,
      relatedCodes: ['ACT-003', 'ACT-004', 'ACT-005'],
    },
    {
      projectId: projects.adminBuilding.id,
      date: '2026-04-24',
      summary: 'تم رفع طلبات التوريد الحرجة للقواعد.',
      completedWork: 'اعتماد طلب الخرسانة والمضخة ومراجعة نقاط الاستلام.',
      workedActivitiesSummary: 'ACT-004, ACT-006',
      blockers: 'المضخة ما زالت غير مؤكدة.',
      tomorrowPlan: 'تثبيت موعد الصب أو إعادة الجدولة ليوم واحد.',
      createdById: demoUsers.rashed.id,
      relatedCodes: ['ACT-004', 'ACT-006'],
    },
    {
      projectId: projects.adminBuilding.id,
      date: '2026-04-25',
      summary: 'التركيز على إقفال القواعد ورفع جاهزية العزل والكهرباء.',
      completedWork: 'مراجعة المواد بالموقع واستلام جزء من مستلزمات الشدات.',
      workedActivitiesSummary: 'ACT-005, ACT-006, ACT-008',
      blockers: 'جاهزية الصب ما زالت مرتبطة بالمضخة.',
      tomorrowPlan: 'إعادة تأكيد جدول المورد والتحضير لبدء كهرباء البدروم.',
      createdById: demoUsers.ali.id,
      relatedCodes: ['ACT-005', 'ACT-006', 'ACT-008'],
    },
    {
      projectId: projects.labs.id,
      date: '2026-04-24',
      summary: 'استمرار خنادق الخدمات ومتابعة حديد الميدات.',
      completedWork: 'رفع 47% من خنادق الخدمات ومراجعة الحصر النهائي للحديد.',
      workedActivitiesSummary: 'ACT-002, ACT-003',
      blockers: 'المورد طلب تأجيل التوريد إلى الأسبوع القادم.',
      tomorrowPlan: 'إقفال مسارات الخدمات وبدء الشدات عند وصول المواد.',
      createdById: demoUsers.sara.id,
      relatedCodes: ['ACT-002', 'ACT-003'],
    },
    {
      projectId: projects.labs.id,
      date: '2026-04-25',
      summary: 'متابعة مشتريات المشروع وإعادة ترتيب أولويات التنفيذ.',
      completedWork: 'تأكيد المواد المتاحة وتمهيد مسار الأعمال الكهربائية الأولية.',
      workedActivitiesSummary: 'ACT-003, ACT-006',
      blockers: 'حديد الميدات ما زال المتغير الحرج للمشروع.',
      tomorrowPlan: 'بدء تجهيزات الكهرباء في المسارات الجاهزة.',
      createdById: demoUsers.mariam.id,
      relatedCodes: ['ACT-003', 'ACT-006'],
    },
    {
      projectId: projects.camp.id,
      date: '2026-04-23',
      summary: 'إنهاء الأعمال المؤقتة بالمحيط العام وبدء الكهرباء المؤقتة.',
      completedWork: 'إنهاء جزء من تمديدات الكهرباء المؤقتة واستلام الموقع للسكن.',
      workedActivitiesSummary: 'ACT-001, ACT-004',
      blockers: 'مواعيد نقل الكونتينرات لم تثبت بعد.',
      tomorrowPlan: 'متابعة المورد وتجهيز قاعدة الكونتينرات.',
      createdById: demoUsers.ali.id,
      relatedCodes: ['ACT-001', 'ACT-004'],
    },
    {
      projectId: projects.camp.id,
      date: '2026-04-25',
      summary: 'تنسيق توريد الكونتينرات واستكمال التجهيزات المؤقتة.',
      completedWork: 'تأكيد المخطط النهائي لتوزيع الكونتينرات ومسارات التغذية المؤقتة.',
      workedActivitiesSummary: 'ACT-002, ACT-004',
      blockers: 'الموافقة المالية على طلب التوريد ما زالت معلقة.',
      tomorrowPlan: 'استكمال الموافقات واستلام الدفعة الأولى.',
      createdById: demoUsers.rashed.id,
      relatedCodes: ['ACT-002', 'ACT-004'],
    },
    {
      projectId: projects.servicesHub.id,
      date: '2026-04-24',
      summary: 'تقدم جيد في القواعد مع ظهور أثر مباشر لتعديل مسارات الخدمات على التكلفة.',
      completedWork: 'استكمال جزء كبير من قواعد غرف الخدمات ومراجعة مخطط تحويل الكابلات والخطوط الصحية مع الاستشاري.',
      workedActivitiesSummary: 'ACT-003, ACT-004',
      blockers: 'لا توجد عوائق توريد، لكن التعديلات التصميمية تستهلك وقتاً وتكلفة إضافية.',
      tomorrowPlan: 'إقفال المسارات النهائية والبدء في تثبيت الحوامل الرئيسية.',
      createdById: demoUsers.sara.id,
      relatedCodes: ['ACT-003', 'ACT-004'],
    },
    {
      projectId: projects.servicesHub.id,
      date: '2026-04-25',
      summary: 'متابعة تنفيذ التحويلات والتهيئة لسطح الخدمات مع رفع تنبيه مالي على أعمال MEP.',
      completedWork: 'تثبيت مسارات رئيسية جديدة داخل غرف الخدمات وتجهيز نقاط المعدات الميكانيكية على السطح.',
      workedActivitiesSummary: 'ACT-004, ACT-005',
      blockers: 'اعتماد الاستشاري لبعض التفاصيل النهائية مطلوب قبل إقفال كامل الأعمال.',
      tomorrowPlan: 'استكمال الحوامل الميكانيكية ومراجعة أمر التغيير مع قسم التكلفة.',
      createdById: demoUsers.mariam.id,
      relatedCodes: ['ACT-004', 'ACT-005'],
    },
  ];

  for (const log of dailyLogs) {
    const created = await prisma.dailyLog.create({
      data: {
        projectId: log.projectId,
        date: d(log.date),
        summary: log.summary,
        completedWork: log.completedWork,
        workedActivitiesSummary: log.workedActivitiesSummary,
        blockers: log.blockers,
        notes: null,
        tomorrowPlan: log.tomorrowPlan,
        createdById: log.createdById,
      },
      select: { id: true },
    });

    await prisma.dailyLogActivity.createMany({
      data: log.relatedCodes.map((code) => ({
        dailyLogId: created.id,
        activityId: activityMap.get(`${log.projectId}:${code}`)!.id,
      })),
      skipDuplicates: true,
    });
  }

  // ── Cost item ids for FK linking ──────────────────────────────────────────
  const ciAdminCivil = await prisma.costItem.findUnique({
    where: { projectId_code: { projectId: projects.adminBuilding.id, code: 'COST-001' } },
    select: { id: true },
  });
  const ciAdminMep = await prisma.costItem.findUnique({
    where: { projectId_code: { projectId: projects.adminBuilding.id, code: 'COST-002' } },
    select: { id: true },
  });
  const ciLabsCivil = await prisma.costItem.findUnique({
    where: { projectId_code: { projectId: projects.labs.id, code: 'COST-001' } },
    select: { id: true },
  });
  const ciServicesCivil = await prisma.costItem.findUnique({
    where: { projectId_code: { projectId: projects.servicesHub.id, code: 'COST-001' } },
    select: { id: true },
  });
  const ciServicesMep = await prisma.costItem.findUnique({
    where: { projectId_code: { projectId: projects.servicesHub.id, code: 'COST-002' } },
    select: { id: true },
  });

  // ── Invoices ──────────────────────────────────────────────────────────────
  const invoiceDefs = [
    {
      projectId: projects.adminBuilding.id,
      invoiceNumber: 'INV-001',
      date: d('2026-01-20'),
      vendor: 'شركة الرياض للخرسانة الجاهزة',
      costItemId: ciAdminCivil?.id,
      description: 'توريد خرسانة جاهزة — المرحلة الأولى (الأساسات)',
      amountBeforeTax: 840000,
      taxAmount: 126000,
      grossAmount: 966000,
      currency: 'SAR',
      status: InvoiceStatus.PAID,
      createdById: demoUsers.ali.id,
    },
    {
      projectId: projects.adminBuilding.id,
      invoiceNumber: 'INV-002',
      date: d('2026-02-10'),
      vendor: 'مؤسسة التقنية الكهربائية',
      costItemId: ciAdminMep?.id,
      description: 'توريد مواد كهربائية — المرحلة الأولى',
      amountBeforeTax: 320000,
      taxAmount: 48000,
      grossAmount: 368000,
      currency: 'SAR',
      status: InvoiceStatus.APPROVED,
      createdById: demoUsers.mariam.id,
    },
    {
      projectId: projects.adminBuilding.id,
      invoiceNumber: 'INV-003',
      date: d('2026-03-05'),
      vendor: 'شركة الرياض للخرسانة الجاهزة',
      costItemId: ciAdminCivil?.id,
      description: 'توريد خرسانة — المرحلة الثانية (الأعمدة والجسور)',
      amountBeforeTax: 960000,
      taxAmount: 144000,
      grossAmount: 1104000,
      currency: 'SAR',
      status: InvoiceStatus.SUBMITTED,
      createdById: demoUsers.ali.id,
    },
    {
      projectId: projects.adminBuilding.id,
      invoiceNumber: 'INV-004',
      date: d('2026-04-01'),
      vendor: 'مقاول الأعمال المدنية المشترك',
      costItemId: ciAdminCivil?.id,
      description: 'أعمال حفر وردم — المرحلة النهائية',
      amountBeforeTax: 185000,
      taxAmount: 27750,
      grossAmount: 212750,
      currency: 'SAR',
      status: InvoiceStatus.DRAFT,
      createdById: demoUsers.rashed.id,
    },
    {
      projectId: projects.labs.id,
      invoiceNumber: 'INV-001',
      date: d('2026-02-15'),
      vendor: 'مؤسسة النور للمعدات',
      costItemId: ciLabsCivil?.id,
      description: 'توريد حديد تسليح وشبكة ميدات — الدفعة الأولى',
      amountBeforeTax: 620000,
      taxAmount: 93000,
      grossAmount: 713000,
      currency: 'SAR',
      status: InvoiceStatus.PAID,
      createdById: demoUsers.sara.id,
    },
    {
      projectId: projects.labs.id,
      invoiceNumber: 'INV-002',
      date: d('2026-03-20'),
      vendor: 'مؤسسة النور للمعدات',
      costItemId: ciLabsCivil?.id,
      description: 'توريد حديد تسليح — الدفعة الثانية',
      amountBeforeTax: 480000,
      taxAmount: 72000,
      grossAmount: 552000,
      currency: 'SAR',
      status: InvoiceStatus.APPROVED,
      createdById: demoUsers.sara.id,
    },
    {
      projectId: projects.camp.id,
      invoiceNumber: 'INV-001',
      date: d('2026-03-10'),
      vendor: 'شركة الخليج للكونتينرات',
      costItemId: null,
      description: 'توريد كونتينرات مكتبية وسكنية — الدفعة الأولى',
      amountBeforeTax: 130000,
      taxAmount: 19500,
      grossAmount: 149500,
      currency: 'SAR',
      status: InvoiceStatus.PAID,
      createdById: demoUsers.noura.id,
    },
    {
      projectId: projects.servicesHub.id,
      invoiceNumber: 'INV-001',
      date: d('2026-04-18'),
      vendor: 'مؤسسة الخليج للخرسانة والبلوك',
      costItemId: ciServicesCivil?.id,
      description: 'أعمال خرسانة وقواعد غرف الخدمات - الدفعة الأولى',
      amountBeforeTax: 1480000,
      taxAmount: 222000,
      grossAmount: 1702000,
      currency: 'SAR',
      status: InvoiceStatus.PAID,
      createdById: demoUsers.ali.id,
    },
    {
      projectId: projects.servicesHub.id,
      invoiceNumber: 'INV-002',
      date: d('2026-04-27'),
      vendor: 'شركة الحلول الكهروميكانيكية',
      costItemId: ciServicesMep?.id,
      description: 'توريد وتنفيذ أعمال MEP الرئيسية داخل غرف الخدمات',
      amountBeforeTax: 980000,
      taxAmount: 147000,
      grossAmount: 1127000,
      currency: 'SAR',
      status: InvoiceStatus.APPROVED,
      createdById: demoUsers.sara.id,
    },
    {
      projectId: projects.servicesHub.id,
      invoiceNumber: 'INV-003',
      date: d('2026-05-04'),
      vendor: 'شركة الحلول الكهروميكانيكية',
      costItemId: ciServicesMep?.id,
      description: 'تحويلات إضافية لمسارات MEP وأعمال إعادة توزيع',
      amountBeforeTax: 910000,
      taxAmount: 136500,
      grossAmount: 1046500,
      currency: 'SAR',
      status: InvoiceStatus.SUBMITTED,
      createdById: demoUsers.yousef.id,
    },
    {
      projectId: projects.maintenance.id,
      invoiceNumber: 'INV-001',
      date: d('2026-04-10'),
      vendor: 'مؤسسة التشطيبات الحديثة',
      costItemId: null,
      description: 'أعمال دهانات ونظافة — الفلل الشمالية',
      amountBeforeTax: 95000,
      taxAmount: 14250,
      grossAmount: 109250,
      currency: 'SAR',
      status: InvoiceStatus.SUBMITTED,
      createdById: demoUsers.ali.id,
    },
  ];

  for (const inv of invoiceDefs) {
    await prisma.invoice.upsert({
      where: { projectId_invoiceNumber: { projectId: inv.projectId, invoiceNumber: inv.invoiceNumber } },
      update: {
        date: inv.date,
        vendor: inv.vendor,
        costItemId: inv.costItemId,
        description: inv.description,
        amountBeforeTax: inv.amountBeforeTax,
        taxAmount: inv.taxAmount,
        grossAmount: inv.grossAmount,
        currency: inv.currency,
        status: inv.status,
        createdById: inv.createdById,
      },
      create: {
        projectId: inv.projectId,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        vendor: inv.vendor,
        costItemId: inv.costItemId,
        description: inv.description,
        amountBeforeTax: inv.amountBeforeTax,
        taxAmount: inv.taxAmount,
        grossAmount: inv.grossAmount,
        currency: inv.currency,
        status: inv.status,
        createdById: inv.createdById,
      },
    });
  }

  // ── Extracts (مستخلصات) ───────────────────────────────────────────────────
  const extractDefs = [
    {
      projectId: projects.adminBuilding.id,
      extractNumber: 'EXT-001',
      date: d('2026-02-28'),
      description: 'المستخلص الأول — أعمال الأساسات والحفر',
      amountBeforeTax: 1200000,
      taxAmount: 180000,
      totalAmount: 1380000,
      currency: 'SAR',
      status: ExtractStatus.PAID,
      createdById: demoUsers.ali.id,
    },
    {
      projectId: projects.adminBuilding.id,
      extractNumber: 'EXT-002',
      date: d('2026-03-31'),
      description: 'المستخلص الثاني — أعمال الهيكل الإنشائي',
      amountBeforeTax: 1750000,
      taxAmount: 262500,
      totalAmount: 2012500,
      currency: 'SAR',
      status: ExtractStatus.APPROVED,
      createdById: demoUsers.rashed.id,
    },
    {
      projectId: projects.adminBuilding.id,
      extractNumber: 'EXT-003',
      date: d('2026-04-20'),
      description: 'المستخلص الثالث — المرحلة الأولى من أعمال الكهرباء والميكانيكا',
      amountBeforeTax: 680000,
      taxAmount: 102000,
      totalAmount: 782000,
      currency: 'SAR',
      status: ExtractStatus.SUBMITTED,
      createdById: demoUsers.mariam.id,
    },
    {
      projectId: projects.labs.id,
      extractNumber: 'EXT-001',
      date: d('2026-03-15'),
      description: 'المستخلص الأول — أعمال الحفر والميدات',
      amountBeforeTax: 950000,
      taxAmount: 142500,
      totalAmount: 1092500,
      currency: 'SAR',
      status: ExtractStatus.PAID,
      createdById: demoUsers.sara.id,
    },
    {
      projectId: projects.labs.id,
      extractNumber: 'EXT-002',
      date: d('2026-04-15'),
      description: 'المستخلص الثاني — أعمال الهيكل المرحلة الأولى',
      amountBeforeTax: 820000,
      taxAmount: 123000,
      totalAmount: 943000,
      currency: 'SAR',
      status: ExtractStatus.DRAFT,
      createdById: demoUsers.sara.id,
    },
    {
      projectId: projects.servicesHub.id,
      extractNumber: 'EXT-001',
      date: d('2026-04-22'),
      description: 'المستخلص الأول - غرف الخدمات والأعمال المدنية',
      amountBeforeTax: 1260000,
      taxAmount: 189000,
      totalAmount: 1449000,
      currency: 'SAR',
      status: ExtractStatus.PAID,
      createdById: demoUsers.sara.id,
    },
    {
      projectId: projects.servicesHub.id,
      extractNumber: 'EXT-002',
      date: d('2026-05-05'),
      description: 'المستخلص الثاني - تحويلات MEP والأعمال الإضافية',
      amountBeforeTax: 1180000,
      taxAmount: 177000,
      totalAmount: 1357000,
      currency: 'SAR',
      status: ExtractStatus.APPROVED,
      createdById: demoUsers.yousef.id,
    },
    {
      projectId: projects.maintenance.id,
      extractNumber: 'EXT-001',
      date: d('2026-04-20'),
      description: 'المستخلص الأول — أعمال الصيانة والتشطيبات',
      amountBeforeTax: 142000,
      taxAmount: 21300,
      totalAmount: 163300,
      currency: 'SAR',
      status: ExtractStatus.SUBMITTED,
      createdById: demoUsers.ali.id,
    },
  ];

  for (const ext of extractDefs) {
    await prisma.extract.upsert({
      where: { projectId_extractNumber: { projectId: ext.projectId, extractNumber: ext.extractNumber } },
      update: {
        date: ext.date,
        description: ext.description,
        amountBeforeTax: ext.amountBeforeTax,
        taxAmount: ext.taxAmount,
        totalAmount: ext.totalAmount,
        currency: ext.currency,
        status: ext.status,
        createdById: ext.createdById,
      },
      create: {
        projectId: ext.projectId,
        extractNumber: ext.extractNumber,
        date: ext.date,
        description: ext.description,
        amountBeforeTax: ext.amountBeforeTax,
        taxAmount: ext.taxAmount,
        totalAmount: ext.totalAmount,
        currency: ext.currency,
        status: ext.status,
        createdById: ext.createdById,
      },
    });
  }

  console.log('Seeded demo clients, tenders, projects, teams, operations, procurement, cost, and daily reports');
  console.log(`Admin login: admin@cdc-system.local / ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
