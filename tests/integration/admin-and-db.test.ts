// tests/integration/admin-and-db.test.ts
import request from 'supertest';
import { prisma } from '@/lib/prisma';
import { createTestServer } from '../helpers/test-server';
import { resetDb } from '../helpers/db';
import { createUser, createProject, createTask, bearer } from '../helpers/factories';

const api = request(createTestServer());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('GET /api/admin/users', () => {
  test('ADM-01: USER role receives 403', async () => {
    const { token } = await createUser();
    expect((await api.get('/api/admin/users').set(bearer(token))).status).toBe(403);
  });

  test('ADM-02: ADMIN receives the user list without password fields', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    await createUser();

    const res = await api.get('/api/admin/users').set(bearer(admin.token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).not.toHaveProperty('passwordHash');
  });

  test('ADM-03: request without a token returns 401', async () => {
    expect((await api.get('/api/admin/users')).status).toBe(401);
  });
});

describe('database behavior', () => {
  test('DB-01: duplicate (ownerId, name) combination throws P2002 error', async () => {
    const { user } = await createUser();
    await createProject(user.id, 'Duplicate');

    await expect(createProject(user.id, 'Duplicate')).rejects.toMatchObject({ code: 'P2002' });
  });

  test('DB-02: deleting a user also deletes their projects and tasks', async () => {
    const { user } = await createUser();
    const project = await createProject(user.id);
    await createTask(project.id);

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.project.count()).toBe(0);
    expect(await prisma.task.count()).toBe(0);
  });

  test('DB-03: deleting an assigned user sets assigneeId to null', async () => {
    const owner = await createUser();
    const assignee = await createUser();
    const project = await createProject(owner.user.id);
    const task = await createTask(project.id, { assigneeId: assignee.user.id });

    await prisma.user.delete({ where: { id: assignee.user.id } });

    const after = await prisma.task.findUnique({ where: { id: task.id } });
    expect(after).not.toBeNull();
    expect(after!.assigneeId).toBeNull();
  });

  test('DB-04 (experiment): concurrent requests should not exceed the 50-task limit', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user.id);

    await prisma.task.createMany({
      data: Array.from({ length: 49 }, (_, i) => ({
        title: `Task ${i}`,
        projectId: project.id,
      })),
    });

    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        api
          .post(`/api/projects/${project.id}/tasks`)
          .set(bearer(token))
          .send({ title: `Concurrent task ${i}` }),
      ),
    );

    const total = await prisma.task.count({ where: { projectId: project.id } });

    expect(total).toBeLessThanOrEqual(50);
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
  });
});