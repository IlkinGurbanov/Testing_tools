
 // tests/unit/http.test.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, getAuthUser, requireRole } from '@/lib/http';
import { ConflictError, ForbiddenError, UnauthorizedError } from '@/lib/error';
import { signToken } from '@/lib/auth';

describe('errorResponse', () => {
  test('UNIT-12: ZodError returns 400 with field details', async () => {
    const parsed = z.object({ name: z.string().min(3) }).safeParse({ name: 'a' });
    if (parsed.success) throw new Error('Expected validation to fail');

    const res = errorResponse(parsed.error);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchSnapshot();
  });

  test('AppError is converted to its own status code', async () => {
    const res = errorResponse(new ConflictError('This email is already registered'));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: 'CONFLICT', message: 'This email is already registered' },
    });
  });

  test('UNIT-13: unknown error returns 500 without leaking internal message', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = errorResponse(new Error('db password: 1234'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('1234');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

const makeReq = (headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost/api/me', { headers });

describe('getAuthUser (UNIT-14, additional)', () => {
  const token = signToken({ sub: 'u1', role: 'USER' });

  test('throws UnauthorizedError when no header or cookie is provided', () => {
    expect(() => getAuthUser(makeReq())).toThrow(UnauthorizedError);
  });

  test('resolves user from Bearer token', () => {
    const user = getAuthUser(makeReq({ authorization: `Bearer ${token}` }));
    expect(user).toEqual({ id: 'u1', role: 'USER' });
  });

  test('resolves user from cookie', () => {
    const user = getAuthUser(makeReq({ cookie: `token=${token}` }));
    expect(user).toEqual({ id: 'u1', role: 'USER' });
  });

  test('rejects an invalid token', () => {
    expect(() => getAuthUser(makeReq({ authorization: 'Bearer invalid' }))).toThrow(UnauthorizedError);
  });
});

describe('requireRole', () => {
  test('throws ForbiddenError when USER accesses an ADMIN-only resource', () => {
    expect(() => requireRole({ id: 'u1', role: 'USER' }, 'ADMIN')).toThrow(ForbiddenError);
  });

  test('allows ADMIN', () => {
    expect(() => requireRole({ id: 'u2', role: 'ADMIN' }, 'ADMIN')).not.toThrow();
  });
});
