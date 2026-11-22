// src/app/api/auth/register/route.ts
import { handle, jsonResponse, readJson } from '@/lib/http';
import { registerSchema } from '@/server/validators/auth.schema';
import * as authService from '@/server/services/auth.service';

export const POST = handle(async (req) => {
  const input = registerSchema.parse(await readJson(req));
  return jsonResponse(await authService.register(input), 201);
});