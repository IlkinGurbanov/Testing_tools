// tests/setup/global-setup.ts
import { execSync } from 'node:child_process';
import { config } from 'dotenv';

export default async function globalSetup() {
  config({ path: '.env.test' });

  const url = process.env.DATABASE_URL ?? '';
  if (!url.includes('test')) {
    throw new Error('DATABASE_URL bir test veritabanını göstermiyor, testler durduruldu.');
  }
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}