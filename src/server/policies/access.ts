// src/server/policies/access.ts
import type { AuthUser } from '@/lib/types';

export function canAccessProject(user: AuthUser, project: { ownerId: string }): boolean {
  return user.role === 'ADMIN' || project.ownerId === user.id;
}