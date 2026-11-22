
// tests/unit/auth-schema.test.ts
import { registerSchema } from '@/server/validators/auth.schema';

const base = { email: 'ali@test.com', name: 'Ali Veli' };

test.each([
  ['7 characters', 'abc1234', false],
  ['without numbers', 'abcdefgh', false],
  ['8 characters and a number', 'abcdefg1', true],
  ['long password with a number', 'Passw0rd!Passw0rd!', true],
])('UNIT-01: password validation - %s', (_label, password, valid) => {
  expect(registerSchema.safeParse({ ...base, password }).success).toBe(valid);
});

test.each([
  ['  ALI@Test.COM ', 'ali@test.com'],
  ['Ali@Test.com', 'ali@test.com'],
])('UNIT-02: %j is normalized', (input, expected) => {
  const parsed = registerSchema.parse({ ...base, email: input, password: 'abcdefg1' });
  expect(parsed.email).toBe(expected);
});

test('rejects invalid email addresses', () => {
  expect(registerSchema.safeParse({ ...base, email: 'ali@', password: 'abcdefg1' }).success).toBe(false);
});
