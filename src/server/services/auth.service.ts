// src/server/services/auth.service.ts
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, signToken } from '@/lib/auth';
import { ConflictError, InvalidCredentialsError, UnauthorizedError } from '@/lib/errors';
import { isUniqueViolation } from '@/lib/prisma-errors';
import type { LoginInput, RegisterInput } from '@/server/validators/auth.schema';

const publicUser = { id: true, email: true, name: true, role: true, createdAt: true } as const;

export async function register(input: RegisterInput) {
  try {
    return await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
      },
      select: publicUser,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError('This email is already registered');
    throw error;
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordOk = user ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!user || !passwordOk) throw new InvalidCredentialsError();

  return {
    token: signToken({ sub: user.id, role: user.role }),
    user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
  };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUser });
  if (!user) throw new UnauthorizedError();
  return user;
}

export function listUsers() {
  return prisma.user.findMany({ select: publicUser, orderBy: { createdAt: 'asc' } });
}