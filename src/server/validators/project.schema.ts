// src/server/validators/project.schema.ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().trim().min(3).max(60),
});
export const updateProjectSchema = createProjectSchema;

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});