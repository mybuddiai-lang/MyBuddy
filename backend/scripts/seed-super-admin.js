'use strict';
/**
 * seed-super-admin.js
 *
 * Creates (or promotes) a SUPER_ADMIN user in the database.
 *
 * Run locally against Railway:
 *   DATABASE_URL="<railway-postgres-url>" node backend/scripts/seed-super-admin.js
 *
 * Or via Railway CLI (uses production env vars automatically):
 *   railway run node scripts/seed-super-admin.js
 *
 * IMPORTANT: Change the password immediately after first login.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const NAME = process.env.ADMIN_NAME || 'Super Admin';

async function main() {
  const prisma = new PrismaClient();

  try {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      update: {
        role: 'SUPER_ADMIN',
        passwordHash,
      },
      create: {
        email: EMAIL,
        name: NAME,
        passwordHash,
        role: 'SUPER_ADMIN',
        subscriptionTier: 'FREE',
        profile: {
          create: {},
        },
      },
    });

    console.log(`\n✓ SUPER_ADMIN ready`);
    console.log(`  ID:    ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role:  ${user.role}`);
    console.log(`\n  → Log in at admin.mybuddyy.vercel.app`);
    console.log(`  → Change the password immediately after first login!\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
