import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed üretim ortamında çalıştırılmaz');
  }

  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Task", "Project", "User" RESTART IDENTITY CASCADE');

  const passwordHash = await bcrypt.hash('Passw0rd!', 10);
  await prisma.user.createMany({
    data: [
      { email: 'demo@taskflow.dev', name: 'Demo Kullanıcı', passwordHash },
      { email: 'admin@taskflow.dev', name: 'Yönetici', role: 'ADMIN', passwordHash },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());