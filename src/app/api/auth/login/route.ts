// src/app/api/auth/login/route.ts
import { handle, jsonResponse, readJson } from '@/lib/http';
import { loginSchema } from '@/server/validators/auth.schema';
import * as authService from '@/server/services/auth.service';

export const POST = handle(async (req) => {
  const input = loginSchema.parse(await readJson(req));
  const { token, user } = await authService.login(input);

  const res = jsonResponse({ token, user });
  res.cookies.set('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
});