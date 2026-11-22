// src/app/api/health/route.ts
import { handle, jsonResponse } from '@/lib/http';

export const GET = handle(async () => jsonResponse({ status: 'ok' }));