// src/server/services/project.service.ts
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { isUniqueViolation } from '@/lib/prisma-errors';
import type { AuthUser } from '@/lib/types';
import { canAccessProject } from '@/server/policies/access';
import type { createProjectSchema, pageQuerySchema } from '@/server/validators/project.schema';

type ProjectInput = z.infer<typeof createProjectSchema>;
type PageQuery = z.infer<typeof pageQuerySchema>;

const CONFLICT_MESSAGE = 'You already have a project with this name';

export async function create(user: AuthUser, input: ProjectInput) {
  try {
    return await prisma.project.create({ data: { name: input.name, ownerId: user.id } });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError(CONFLICT_MESSAGE);
    throw error;
  }
}

export async function list(user: AuthUser, query: PageQuery) {
  const where = { ownerId: user.id };
  const [items, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.project.count({ where }),
  ]);
  return { items, page: query.page, limit: query.limit, total };
}

export async function getOwned(user: AuthUser, id: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || !canAccessProject(user, project)) throw new NotFoundError('Project not found');
  return project;
}

export async function update(user: AuthUser, id: string, input: ProjectInput) {
  await getOwned(user, id);
  try {
    return await prisma.project.update({ where: { id }, data: { name: input.name } });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError(CONFLICT_MESSAGE);
    throw error;
  }
}

export async function remove(user: AuthUser, id: string) {
  await getOwned(user, id);
  await prisma.project.delete({ where: { id } });
}