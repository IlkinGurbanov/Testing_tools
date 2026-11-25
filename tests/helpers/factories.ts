// tests/helpers/factories.ts
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';

let seq = 0;

export async function createUser(over: { email?: string; role?: 'USER' | 'ADMIN' } = {}) {
  seq += 1;
  const user = await prisma.user.create({
    data: {
      email: over.email ?? `user${seq}@test.dev`,
      name: `Kullanıcı ${seq}`,
      role: over.role ?? 'USER',
      passwordHash: await hashPassword('Passw0rd!'),
    },
  });
  return { user, token: signToken({ sub: user.id, role: user.role }) };
}

export function createProject(ownerId: string, name = 'Proje') {
  return prisma.project.create({ data: { name, ownerId } });
}

export function createTask(
  projectId: string,
  over: { title?: string; status?: 'TODO' | 'IN_PROGRESS' | 'DONE'; assigneeId?: string } = {},
) {
  return prisma.task.create({
    data: { title: over.title ?? 'Görev', status: over.status ?? 'TODO', assigneeId: over.assigneeId, projectId },
  });
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });