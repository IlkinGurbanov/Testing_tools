// src/lib/types.ts
export type Role = 'USER' | 'ADMIN';
export type AuthUser = { id: string; role: Role };