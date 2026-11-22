// src/lib/http.ts
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, ForbiddenError, UnauthorizedError, ValidationError } from './error';
import { verifyToken } from './auth';
import type { AuthUser, Role } from './types';

export const jsonResponse = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const noContent = () => new NextResponse(null, { status: 204 });

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      },
      { status: 400 },
    );
  }
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }
  console.error(error);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
    { status: 500 },
  );
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError(undefined, 'Request body is not valid JSON');
  }
}

export function getAuthUser(req: NextRequest): AuthUser {
  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies.get('token')?.value;
  if (!token) throw new UnauthorizedError();
  const payload = verifyToken(token);
  return { id: payload.sub, role: payload.role };
}

export function requireRole(user: AuthUser, role: Role): void {
  if (user.role !== role) throw new ForbiddenError();
}

type Ctx<P> = { params: Promise<P> };

export function handle<P = Record<string, string>>(
  fn: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: Ctx<P>): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}