// tests/unit/auth-lib.test.ts
import { hashPassword, verifyPassword, signToken, verifyToken } from '@/lib/auth';
import { UnauthorizedError } from '@/lib/errors';

describe('parola', () => {
  test('UNIT-08: A hash is not a plain-text password, and it is verified.', async () => {
    const hash = await hashPassword('Passw0rd!');

    expect(hash).not.toBe('Passw0rd!');
    await expect(verifyPassword('Passw0rd!', hash)).resolves.toBe(true);
    await expect(verifyPassword('yanlis', hash)).resolves.toBe(false);
  });
});

describe('token', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T10:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('UNIT-09: 59 dakika geçerli, 61 dakika sonra süresi dolar', () => {
    const token = signToken({ sub: 'u1', role: 'USER' });

    jest.advanceTimersByTime(59 * 60 * 1000);
    expect(verifyToken(token)).toEqual({ sub: 'u1', role: 'USER' });

    jest.advanceTimersByTime(2 * 60 * 1000);
    expect(() => verifyToken(token)).toThrow(UnauthorizedError);
  });

  test('bozuk token reddedilir', () => {
    expect(() => verifyToken('bozuk.token.degeri')).toThrow(UnauthorizedError);
  });
});