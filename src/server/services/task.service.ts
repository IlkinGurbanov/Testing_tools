// src/server/services/task.service.ts
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { NotFoundError, UnprocessableError, ValidationError } from '@/lib/errors';
import type { AuthUser } from '@/lib/types';
import { canAccessProject } from '@/server/policies/access';
import { canTransition, type TaskStatus } from '@/server/policies/task-status';
import type {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
} from '@/server/validators/task.schema';
import * as projectService from './project.service';

type CreateInput = z.infer<typeof createTaskSchema>;
type UpdateInput = z.infer<typeof updateTaskSchema>;
type ListQuery = z.infer<typeof listTasksQuerySchema>;

const MAX_TASKS_PER_PROJECT = 50;

async function assertAssigneeExists(assigneeId?: string) {
  if (!assigneeId) return;
  const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!assignee) {
    throw new ValidationError([{ path: 'assigneeId', message: 'User not found' }]);
  }
}

export async function getOwnedTask(user: AuthUser, taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
  if (!task || !canAccessProject(user, task.project)) throw new NotFoundError('Task not found');
  return task;
}

export async function create(user: AuthUser, projectId: string, input: CreateInput) {
  await projectService.getOwned(user, projectId);

  const count = await prisma.task.count({ where: { projectId } });
  if (count >= MAX_TASKS_PER_PROJECT) {
    throw new UnprocessableError(`A project can have a maximum of ${MAX_TASKS_PER_PROJECT} tasks`);
  }

  await assertAssigneeExists(input.assigneeId);
  return prisma.task.create({
    data: { title: input.title, dueDate: input.dueDate, assigneeId: input.assigneeId, projectId },
  });
}

export async function list(user: AuthUser, projectId: string, query: ListQuery) {
  await projectService.getOwned(user, projectId);
  const where = { projectId, ...(query.status ? { status: query.status } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.task.count({ where }),
  ]);
  return { items, page: query.page, limit: query.limit, total };
}

export async function update(user: AuthUser, taskId: string, input: UpdateInput) {
  await getOwnedTask(user, taskId);
  await assertAssigneeExists(input.assigneeId);
  return prisma.task.update({ where: { id: taskId }, data: input });
}

export async function changeStatus(user: AuthUser, taskId: string, status: TaskStatus) {
  const task = await getOwnedTask(user, taskId);
  if (!canTransition(task.status, status)) {
    throw new UnprocessableError(`Cannot transition from ${task.status} to ${status}`);
  }
  return prisma.task.update({ where: { id: taskId }, data: { status } });
}

export async function remove(user: AuthUser, taskId: string) {
  await getOwnedTask(user, taskId);
  await prisma.task.delete({ where: { id: taskId } });
}