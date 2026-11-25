// tests/unit/task.service.test.ts
// tests/unit/task.service.test.ts (en üstteki jest.mock bloğu)
jest.mock('@/lib/prisma', () => {
  const prisma: Record<string, unknown> = {
    project: { findUnique: jest.fn() },
    task: { count: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn() },
    $queryRaw: jest.fn(),
  };
  prisma.$transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(prisma));
  return { prisma };
});

import { prisma } from '@/lib/prisma';
import { UnprocessableError, NotFoundError } from '@/lib/errors';
import * as taskService from '@/server/services/task.service';

const projectFind = prisma.project.findUnique as unknown as jest.Mock;
const taskCount = prisma.task.count as unknown as jest.Mock;
const taskCreate = prisma.task.create as unknown as jest.Mock;
const user = { id: 'u1', role: 'USER' as const };

beforeEach(() => {
  jest.clearAllMocks();
  projectFind.mockResolvedValue({ id: 'p1', ownerId: 'u1' });
});

describe('task.service.create', () => {
  test('UNIT-11: throws UnprocessableError when the project has 50 tasks', async () => {
    taskCount.mockResolvedValue(50);

    await expect(taskService.create(user, 'p1', { title: 'New task' })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
    expect(taskCreate).not.toHaveBeenCalled();
  });

  test('creates a task when the project has 49 tasks', async () => {
    taskCount.mockResolvedValue(49);
    taskCreate.mockResolvedValue({ id: 't1' });

    await taskService.create(user, 'p1', { title: 'New task' });

    expect(taskCreate).toHaveBeenCalledTimes(1);
  });

  test('prevents users from adding tasks to someone else’s project (NotFoundError)', async () => {
    projectFind.mockResolvedValue({ id: 'p1', ownerId: 'another-user' });

    await expect(taskService.create(user, 'p1', { title: 'New task' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(taskCount).not.toHaveBeenCalled();
  });
});