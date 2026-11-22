
// src/server/validators/auth.schema.ts
import { z } from 'zod';

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

const email = z.string().trim().email().transform(normalizeEmail);

export const registerSchema = z.object({
  email,
  name: z.string().trim().min(2).max(60),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
