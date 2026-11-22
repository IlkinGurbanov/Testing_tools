// src/app/api/admin/users/route.ts
import { getAuthUser, handle, jsonResponse, requireRole } from '@/lib/http';
import * as authService from '@/server/services/auth.service';

export const GET = handle(async (req) => {
  const user = getAuthUser(req);
  requireRole(user, 'ADMIN');
  return jsonResponse(await authService.listUsers());
});