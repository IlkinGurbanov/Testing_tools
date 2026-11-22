// src/server/validators/task.schema.ts
import { z } from 'zod';
import { pageQuerySchema } from './project.schema';

export const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);

function startOfTodayUtc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

const dueDate = z.coerce
  .date()
  .refine((d) => d.getTime() >= startOfTodayUtc(), 'dueDate geçmişte olamaz');

export const createTaskSchema = z.object({
  title: z.string().trim().min(3).max(100),
  dueDate: dueDate.optional(),
  assigneeId: z.string().uuid().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();
export const updateStatusSchema = z.object({ status: taskStatusSchema });
export const listTasksQuerySchema = pageQuerySchema.extend({ status: taskStatusSchema.optional() });