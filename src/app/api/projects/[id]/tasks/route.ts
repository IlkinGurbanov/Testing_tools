// src/app/api/projects/[id]/tasks/route.ts
import { getAuthUser, handle, jsonResponse, readJson } from '@/lib/http';
import { createTaskSchema, listTasksQuerySchema } from '@/server/validators/task.schema';
import * as taskService from '@/server/services/task.service';

type P = { id: string };

export const GET = handle<P>(async (req, { params }) => {
  const user = getAuthUser(req);
  const { id } = await params;
  const query = listTasksQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return jsonResponse(await taskService.list(user, id, query));
});

export const POST = handle<P>(async (req, { params }) => {
  const user = getAuthUser(req);
  const { id } = await params;
  const input = createTaskSchema.parse(await readJson(req));
  return jsonResponse(await taskService.create(user, id, input), 201);
});