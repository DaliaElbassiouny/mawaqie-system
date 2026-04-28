/**
 * Local-dev only — quickly resets the admin user to known credentials
 * without running the full seed (no demo data touched).
 *
 * Usage:  pnpm --filter @cdc/api db:reset-admin
 *    or:  pnpm db:reset-admin          (from monorepo root)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const DEV_EMAIL = 'admin@cdc-system.local';
const DEV_PASSWORD = 'Admin@123456';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌  reset-admin must not run in production (NODE_ENV=production)');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const hash = await bcrypt.hash(DEV_PASSWORD, 12);

    const user = await prisma.user.upsert({
      where: { email: DEV_EMAIL },
      update: { password: hash, isActive: true },
      create: {
        email: DEV_EMAIL,
        password: hash,
        nameAr: 'مدير النظام',
        nameEn: 'System Admin',
        isActive: true,
      },
    });

    // Ensure SUPER_ADMIN role exists and is assigned
    const superAdminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
    if (superAdminRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId_projectId: { userId: user.id, roleId: superAdminRole.id, projectId: null } },
        update: {},
        create: { userId: user.id, roleId: superAdminRole.id, projectId: null },
      });
      console.log(`✅  Admin role confirmed`);
    } else {
      console.warn('⚠️   SUPER_ADMIN role not found — run pnpm db:seed first to create roles');
    }

    console.log(`✅  Admin credentials reset`);
    console.log(`    Email:    ${DEV_EMAIL}`);
    console.log(`    Password: ${DEV_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
