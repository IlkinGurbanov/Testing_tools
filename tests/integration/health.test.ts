// tests/integration/health.test.ts
import request from 'supertest';
import { prisma } from '@/lib/prisma';
import { createTestServer } from '../helpers/test-server';

afterAll(() => prisma.$disconnect());

test('HLT-01: /api/health 200', async () => {
  const res = await request(createTestServer()).get('/api/health');

  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});