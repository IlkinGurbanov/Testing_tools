// tests/unit/task-schema.test.ts
import { createTaskSchema } from '@/server/validators/task.schema';

test.each([
  [2, false],
  [3, true],
  [100, true],
  [101, false],
])('UNIT-04: title %i characters -> valid=%s', (length, valid) => {
  expect(createTaskSchema.safeParse({ title: 'a'.repeat(length) }).success).toBe(valid);
});

describe('UNIT-05: dueDate rules (saat sabit: 2026-01-15 10:00 UTC)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T10:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test.each([
    ['dün', '2026-01-14T10:00:00Z', false],
    ['bugün (even though the hour has passed)', '2026-01-15T08:00:00Z', true],
    ['yarın', '2026-01-16T10:00:00Z', true],
  ])('%s', (_label, dueDate, valid) => {
    expect(createTaskSchema.safeParse({ title: 'Rapor', dueDate }).success).toBe(valid);
  });

  test('Valid if dueDate is not provided', () => {
    expect(createTaskSchema.safeParse({ title: 'Rapor' }).success).toBe(true);
  });
});