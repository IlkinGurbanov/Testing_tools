// tests/integration/auth.test.ts
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { createTestServer } from '../helpers/test-server';
import { resetDb } from '../helpers/db';
import { createUser, bearer } from '../helpers/factories';

const server = createTestServer();
const api = request(server);

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const validUser = {
  email: 'ali@test.com',
  name: 'Ali Veli',
  password: 'Passw0rd!',
};

describe('POST /api/auth/register', () => {
  test('AUTH-01: valid registration returns 201 and does not expose the password', async () => {
    const res = await api.post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      email: 'ali@test.com',
      name: 'Ali Veli',
      role: 'USER',
    });
    expect(res.body).not.toHaveProperty('passwordHash');

    const row = await prisma.user.findUnique({
      where: { email: 'ali@test.com' },
    });

    expect(row).not.toBeNull();
    expect(row!.passwordHash).not.toBe(validUser.password);
  });

  test('AUTH-02: duplicate email with different letter casing returns 409', async () => {
    await api.post('/api/auth/register').send(validUser);

    const res = await api
      .post('/api/auth/register')
      .send({ ...validUser, email: 'ALI@Test.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('AUTH-03: weak password returns 400 and identifies the password field', async () => {
    const res = await api
      .post('/api/auth/register')
      .send({ ...validUser, password: 'abc' });

    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toContain('password');
  });

  test('invalid JSON returns 400', async () => {
    const res = await api
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{broken');

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await api.post('/api/auth/register').send(validUser);
  });

  test('AUTH-04: successful login returns a token and an HttpOnly cookie', async () => {
    const res = await api
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');

    const cookie = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(cookie).toContain('token=');
    expect(cookie).toContain('HttpOnly');
  });

  test('AUTH-05: wrong password and non-existent user return the same response', async () => {
    const wrong = await api
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'Wrong123' });

    const unknown = await api
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'Wrong123' });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });
});

describe('GET /api/me', () => {
  test('AUTH-06: request without a token returns 401', async () => {
    expect((await api.get('/api/me')).status).toBe(401);
  });

  test('AUTH-07: invalid token returns 401', async () => {
    const res = await api.get('/api/me').set('Authorization', 'Bearer invalid');

    expect(res.status).toBe(401);
  });

  test('AUTH-08: expired token returns 401', async () => {
    const { user } = await createUser();

    const expired = jwt.sign(
      { sub: user.id, role: 'USER' },
      process.env.JWT_SECRET!,
      {
        expiresIn: -10,
      },
    );

    const res = await api.get('/api/me').set(bearer(expired));

    expect(res.status).toBe(401);
  });

  test('AUTH-09: valid token returns the correct user', async () => {
    const { user, token } = await createUser();

    const res = await api.get('/api/me').set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  test('AUTH-10: authentication also works with a login cookie (agent)', async () => {
    const { user } = await createUser();
    const agent = request.agent(server);

    await agent.post('/api/auth/login').send({
      email: user.email,
      password: 'Passw0rd!',
    });

    const res = await agent.get('/api/me');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
  });
});