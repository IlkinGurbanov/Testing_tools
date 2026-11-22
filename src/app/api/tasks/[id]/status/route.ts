// src/app/api/tasks/[id]/status/route.ts
import { getAuthUser, handle, jsonResponse, readJson } from '@/lib/http';
import { updateStatusSchema } from '@/server/validators/task.schema';
import * as taskService from '@/server/services/task.service';

export const PATCH = handle<{ id: string }>(async (req, { params }) => {
  const user = getAuthUser(req);
  const { id } = await params;
  const { status } = updateStatusSchema.parse(await readJson(req));
  return jsonResponse(await taskService.changeStatus(user, id, status));
});