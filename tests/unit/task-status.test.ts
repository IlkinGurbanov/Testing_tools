// tests/unit/task-status.test.ts
import { canTransition, type TaskStatus } from '@/server/policies/task-status';

test.each([
  ['TODO', 'IN_PROGRESS', true],
  ['IN_PROGRESS', 'TODO', true],
  ['IN_PROGRESS', 'DONE', true],
  ['DONE', 'IN_PROGRESS', true],
  ['TODO', 'DONE', false],
  ['DONE', 'TODO', false],
  ['TODO', 'TODO', false],
  ['IN_PROGRESS', 'IN_PROGRESS', false],
  ['DONE', 'DONE', false],
])('UNIT-06: %s -> %s = %s', (from, to, expected) => {
  expect(canTransition(from as TaskStatus, to as TaskStatus)).toBe(expected);
});