// src/app/api/projects/[id]/route.ts
import { getAuthUser, handle, jsonResponse, noContent, readJson } from '@/lib/http';
import { updateProjectSchema } from '@/server/validators/project.schema';
import * as projectService from '@/server/services/project.service';

type P = { id: string };

export const GET = handle<P>(async (req, { params }) => {
  const user = getAuthUser(req);
  const { id } = await params;
  return jsonResponse(await projectService.getOwned(user, id));
});

export const PATCH = handle<P>(async (req, { params }) => {
  const user = getAuthUser(req);
  const { id } = await params;
  const input = updateProjectSchema.parse(await readJson(req));
  return jsonResponse(await projectService.update(user, id, input));
});

export const DELETE = handle<P>(async (req, { params }) => {
  const user = getAuthUser(req);
  const { id } = await params;
  await projectService.remove(user, id);
  return noContent();
});