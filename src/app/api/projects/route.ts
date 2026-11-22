// src/app/api/projects/route.ts
import { getAuthUser, handle, jsonResponse, readJson } from '@/lib/http';
import { createProjectSchema, pageQuerySchema } from '@/server/validators/project.schema';
import * as projectService from '@/server/services/project.service';

export const GET = handle(async (req) => {
  const user = getAuthUser(req);
  const query = pageQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return jsonResponse(await projectService.list(user, query));
});

export const POST = handle(async (req) => {
  const user = getAuthUser(req);
  const input = createProjectSchema.parse(await readJson(req));
  return jsonResponse(await projectService.create(user, input), 201);
});