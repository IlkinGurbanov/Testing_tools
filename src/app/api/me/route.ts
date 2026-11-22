// src/app/api/me/route.ts
import { getAuthUser, handle, jsonResponse } from '@/lib/http';
import * as authService from '@/server/services/auth.service';

export const GET = handle(async (req) => {
  const user = getAuthUser(req);
  return jsonResponse(await authService.me(user.id));
});