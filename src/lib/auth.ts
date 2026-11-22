// src/lib/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { UnauthorizedError } from './error';
import type { Role } from './types';

export type TokenPayload = { sub: string; role: Role };

export const hashPassword = (plain: string) => bcrypt.hash(plain, env.bcryptRounds);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    return { sub: String(decoded.sub), role: decoded.role as Role };
  } catch {
    throw new UnauthorizedError();
  }
}