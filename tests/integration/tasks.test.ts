// tests/integration/tasks.test.ts
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { prisma } from '@/lib/prisma';
import { createTestServer } from '../helpers/test-server';
import { resetDb } from '../helpers/db';
import { createUser, createProject, createTask, bearer } from '../helpers/factories';

const api = request(createTestServer());

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function setup() {
  const { user, token } = await createUser();
  const project = await createProject(user.id);
  return { user, token, project };
}

describe('POST /api/projects/:id/tasks', () => {
  test('TSK-01: creates a task with TODO status by default', async () => {
    const { token, project } = await setup();

    const res = await api
      .post(`/api/projects/${project.id}/tasks`)
      .set(bearer(token))
      .send({ title: 'Write a report' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Write a report',
      status: 'TODO',
      projectId: project.id,
    });
  });

  test('TSK-02: past dueDate returns 400', async () => {
    const { token, project } = await setup();

    const res = await api
      .post(`/api/projects/${project.id}/tasks`)
      .set(bearer(token))
      .send({ title: 'Write a report', dueDate: '2000-01-01T00:00:00Z' });

    expect(res.status).toBe(400);
  });

  test('TSK-03: the 51st task returns 422', async () => {
    const { token, project } = await setup();

    await prisma.task.createMany({
      data: Array.from({ length: 50 }, (_, i) => ({
        title: `Task ${i}`,
        projectId: project.id,
      })),
    });

    const res = await api
      .post(`/api/projects/${project.id}/tasks`)
      .set(bearer(token))
      .send({ title: 'Excess task' });

    expect(res.status).toBe(422);
  });

  test('TSK-09: non-existent assigneeId returns 400', async () => {
    const { token, project } = await setup();

    const res = await api
      .post(`/api/projects/${project.id}/tasks`)
      .set(bearer(token))
      .send({ title: 'Write a report', assigneeId: randomUUID() });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/projects/:id/tasks', () => {
  test('TSK-04: status filter returns only matching tasks', async () => {
    const { token, project } = await setup();

    await createTask(project.id, { status: 'DONE', title: 'Completed' });
    await createTask(project.id, { status: 'TODO', title: 'Pending' });

    const res = await api
      .get(`/api/projects/${project.id}/tasks?status=DONE`)
      .set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.items.map((t: { title: string }) => t.title)).toEqual(['Completed']);
    expect(res.body.total).toBe(1);
  });

  test('TSK-05: invalid status returns 400', async () => {
    const { token, project } = await setup();

    const res = await api
      .get(`/api/projects/${project.id}/tasks?status=BAS`)
      .set(bearer(token));

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/tasks/:id/status', () => {
  test.each([
    ['TODO', 'IN_PROGRESS', 200],
    ['IN_PROGRESS', 'DONE', 200],
    ['DONE', 'IN_PROGRESS', 200],
    ['TODO', 'DONE', 422],
    ['DONE', 'TODO', 422],
  ])('TSK-06: %s -> %s = %i', async (from, to, expected) => {
    const { token, project } = await setup();

    const task = await createTask(project.id, {
      status: from as 'TODO' | 'IN_PROGRESS' | 'DONE',
    });

    const res = await api
      .patch(`/api/tasks/${task.id}/status`)
      .set(bearer(token))
      .send({ status: to });

    expect(res.status).toBe(expected);

    const after = await prisma.task.findUnique({ where: { id: task.id } });

    expect(after!.status).toBe(expected === 200 ? to : from);
  });
});

describe('unauthorized task access and deletion', () => {
  test('TSK-07: another user cannot update or delete the task (404)', async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const project = await createProject(owner.user.id);
    const task = await createTask(project.id);

    const patch = await api
      .patch(`/api/tasks/${task.id}`)
      .set(bearer(intruder.token))
      .send({ title: 'Hijacked' });

    const del = await api
      .delete(`/api/tasks/${task.id}`)
      .set(bearer(intruder.token));

    expect(patch.status).toBe(404);
    expect(del.status).toBe(404);
    expect(await prisma.task.count({ where: { id: task.id } })).toBe(1);
  });

  test('TSK-08: deleting a task returns 204 and removes the record', async () => {
    const { token, project } = await setup();
    const task = await createTask(project.id);

    const res = await api
      .delete(`/api/tasks/${task.id}`)
      .set(bearer(token));

    expect(res.status).toBe(204);
    expect(await prisma.task.count({ where: { id: task.id } })).toBe(0);
  });
});