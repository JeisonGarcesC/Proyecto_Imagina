import { PrismaClient } from '@prisma/client';

const globalDb = globalThis;

export const prisma = globalDb.__imaginaPrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalDb.__imaginaPrisma = prisma;
}
