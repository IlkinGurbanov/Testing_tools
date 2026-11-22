// tests/unit/access.test.ts
import { canAccessProject } from '@/server/policies/access';
import type { AuthUser } from '@/lib/types';

const owner: AuthUser = { id: 'u1', role: 'USER' };
const other: AuthUser = { id: 'u2', role: 'USER' };
const admin: AuthUser = { id: 'u3', role: 'ADMIN' };
const project = { ownerId: 'u1' };

test.each([
  ['owner', owner, true],
  ['other user', other, false],
  ['ADMIN', admin, true],
])('UNIT-07: %s -> %s', (_label, user, expected) => {
  expect(canAccessProject(user, project)).toBe(expected);
});