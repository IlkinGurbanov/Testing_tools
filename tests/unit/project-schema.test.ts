// tests/unit/project-schema.test.ts
import { createProjectSchema } from '@/server/validators/project.schema';

test.each([
  [2, false],
  [3, true],
  [60, true],
  [61, false],
])('UNIT-03: project name %i characters -> valid=%s', (length, valid) => {
  const result = createProjectSchema.safeParse({ name: 'a'.repeat(length) });
  expect(result.success).toBe(valid);
});