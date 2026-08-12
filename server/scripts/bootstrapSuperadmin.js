import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { bootstrapSuperadmin } from '../src/roles/bootstrapSuperadminService.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio.');

const db = new PrismaClient();

try {
  const user = await bootstrapSuperadmin({
    db,
    username: process.env.BOOTSTRAP_ADMIN_USERNAME,
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    displayName: process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });
  console.log(`SUPERADMIN creado: ${user.username} (${user.id}).`);
} finally {
  await db.$disconnect();
}
