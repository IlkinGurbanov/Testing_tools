// tests/integration/projects.test.ts
import request from 'supertest';
import { prisma } from '@/lib/prisma';
import { createTestServer } from '../helpers/test-server';
import { resetDb } from '../helpers/db';
import { createUser, createProject, createTask, bearer } from '../helpers/factories';

const api = request(createTestServer());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('POST /api/projects', () => {
  test('PRJ-01: creates a project, and its owner is the authenticated user', async () => {
    const { user, token } = await createUser();

    const res = await api
      .post('/api/projects')
      .set(bearer(token))
      .send({ name: 'Sprint 1' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Sprint 1', ownerId: user.id });
  });

  test('PRJ-02: short project name returns 400', async () => {
    const { token } = await createUser();

    const res = await api
      .post('/api/projects')
      .set(bearer(token))
      .send({ name: 'ab' });

    expect(res.status).toBe(400);
  });

  test('PRJ-03: the same user gets 409 for a duplicate project name, while another user gets 201', async () => {
    const a = await createUser();
    const b = await createUser();

    await api
      .post('/api/projects')
      .set(bearer(a.token))
      .send({ name: 'Shared Name' });

    const again = await api
      .post('/api/projects')
      .set(bearer(a.token))
      .send({ name: 'Shared Name' });

    const other = await api
      .post('/api/projects')
      .set(bearer(b.token))
      .send({ name: 'Shared Name' });

    expect(again.status).toBe(409);
    expect(other.status).toBe(201);
  });

  test('returns 401 when no token is provided', async () => {
    const res = await api.post('/api/projects').send({ name: 'Sprint 1' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/projects', () => {
  test('PRJ-04: lists only the authenticated user’s projects', async () => {
    const a = await createUser();
    const b = await createUser();

    await createProject(a.user.id, 'My Project');
    await createProject(b.user.id, 'Someone Else’s Project');

    const res = await api.get('/api/projects').set(bearer(a.token));

    expect(res.status).toBe(200);
    expect(res.body.items.map((p: { name: string }) => p.name)).toEqual(['My Project']);
  });

  test('PRJ-05: pagination works correctly', async () => {
    const { user, token } = await createUser();

    await prisma.project.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({
        name: `Project ${i + 1}`,
        ownerId: user.id,
      })),
    });

    const res = await api
      .get('/api/projects?limit=10&page=3')
      .set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(5);
    expect(res.body).toMatchObject({ page: 3, limit: 10, total: 25 });
  });

  test('invalid limit returns 400', async () => {
    const { token } = await createUser();

    const res = await api
      .get('/api/projects?limit=1000')
      .set(bearer(token));

    expect(res.status).toBe(400);
  });
});

describe('/api/projects/:id (authorization)', () => {
  test('PRJ-06: another user’s project returns 404 (IDOR)', async () => {
    const a = await createUser();
    const b = await createUser();

    const project = await createProject(a.user.id, 'Private Project');

    const res = await api
      .get(`/api/projects/${project.id}`)
      .set(bearer(b.token));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('PRJ-07: another user cannot update or delete the project', async () => {
    const a = await createUser();
    const b = await createUser();

    const project = await createProject(a.user.id, 'Private Project');

    const patch = await api
      .patch(`/api/projects/${project.id}`)
      .set(bearer(b.token))
      .send({ name: 'Hijacked' });

    const del = await api
      .delete(`/api/projects/${project.id}`)
      .set(bearer(b.token));

    expect(patch.status).toBe(404);
    expect(del.status).toBe(404);

    const row = await prisma.project.findUnique({
      where: { id: project.id },
    });

    expect(row?.name).toBe('Private Project');
  });

  test('PRJ-08: ADMIN can view another user’s project', async () => {
    const owner = await createUser();
    const admin = await createUser({ role: 'ADMIN' });

    const project = await createProject(owner.user.id);

    const res = await api
      .get(`/api/projects/${project.id}`)
      .set(bearer(admin.token));

    expect(res.status).toBe(200);
  });

  test('PRJ-09: deleting a project also deletes its tasks', async () => {
    const { user, token } = await createUser();

    const project = await createProject(user.id);
    await createTask(project.id);
    await createTask(project.id);

    const res = await api
      .delete(`/api/projects/${project.id}`)
      .set(bearer(token));

    expect(res.status).toBe(204);

    expect(
      await prisma.task.count({ where: { projectId: project.id } }),
    ).toBe(0);
  });

  test('PRJ-10: non-existent and malformed IDs return 404', async () => {
    const { token } = await createUser();

    const res = await api
      .get('/api/projects/this-is-not-a-uuid')
      .set(bearer(token));

    expect(res.status).toBe(404);
  });
});