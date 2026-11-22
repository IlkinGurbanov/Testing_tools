// tests/unit/project.service.test.ts
jest.mock('@/lib/prisma', () => ({
  prisma: { project: { create: jest.fn() } },
}));

import { prisma } from '@/lib/prisma';
import { ConflictError } from '@/lib/errors';
import * as projectService from '@/server/services/project.service';

const createMock = prisma.project.create as unknown as jest.Mock;
const user = { id: 'u1', role: 'USER' as const };

beforeEach(() => jest.clearAllMocks());

describe('project.service.create', () => {
  test('saves the token owner as the project owner', async () => {
    createMock.mockResolvedValue({ id: 'p1', name: 'Sprint 1', ownerId: 'u1' });

    const project = await projectService.create(user, { name: 'Sprint 1' });

    expect(createMock).toHaveBeenCalledWith({ data: { name: 'Sprint 1', ownerId: 'u1' } });
    expect(project.id).toBe('p1');
  });

  test('UNIT-10: converts P2002 error into ConflictError', async () => {
    createMock.mockRejectedValue({ code: 'P2002' });

    await expect(projectService.create(user, { name: 'Sprint 1' })).rejects.toBeInstanceOf(ConflictError);
  });

  test('rethrows unknown errors without modification', async () => {
    const boom = new Error('Connection lost');
    createMock.mockRejectedValue(boom);

    await expect(projectService.create(user, { name: 'Sprint 1' })).rejects.toBe(boom);
  });
});