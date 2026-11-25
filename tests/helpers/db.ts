// tests/helpers/db.ts
import { prisma } from '@/lib/prisma';

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Task", "Project", "User" RESTART IDENTITY CASCADE',
  );
}