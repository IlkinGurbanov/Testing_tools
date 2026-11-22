// src/app/api/tasks/[id]/route.ts
import { getAuthUser, handle, jsonResponse, noContent, readJson } from '@/lib/http';
import { updateTaskSchema } from '@/server/validators/task.schema';
import * as taskService from '@/server/services/task.service';

type P = { id: string };

export const PATCH = handle<P>(async (req, { params }) => {
  const user = getAuthUser(req);
  const { id } = await params;
  const input = updateTaskSchema.parse(await readJson(req));
  return jsonResponse(await taskService.update(user, id, input));
});

export const DELETE = handle<P>(async (req, { params }) => {
  const user = getAuthUser(req);
  const { id } = await params;
  await taskService.remove(user, id);
  return noContent();
});