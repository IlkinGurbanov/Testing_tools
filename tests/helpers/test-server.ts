// tests/helpers/test-server.ts
import http from 'node:http';
import { NextRequest } from 'next/server';
import * as health from '@/app/api/health/route';
import * as register from '@/app/api/auth/register/route';
import * as login from '@/app/api/auth/login/route';
import * as me from '@/app/api/me/route';
import * as adminUsers from '@/app/api/admin/users/route';
import * as projects from '@/app/api/projects/route';
import * as project from '@/app/api/projects/[id]/route';
import * as projectTasks from '@/app/api/projects/[id]/tasks/route';
import * as task from '@/app/api/tasks/[id]/route';
import * as taskStatus from '@/app/api/tasks/[id]/status/route';

type Handler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const routes: { pattern: string; mod: Record<string, Handler> }[] = [
  { pattern: '/api/health', mod: health as never },
  { pattern: '/api/auth/register', mod: register as never },
  { pattern: '/api/auth/login', mod: login as never },
  { pattern: '/api/me', mod: me as never },
  { pattern: '/api/admin/users', mod: adminUsers as never },
  { pattern: '/api/projects', mod: projects as never },
  { pattern: '/api/projects/[id]', mod: project as never },
  { pattern: '/api/projects/[id]/tasks', mod: projectTasks as never },
  { pattern: '/api/tasks/[id]', mod: task as never },
  { pattern: '/api/tasks/[id]/status', mod: taskStatus as never },
];

function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/');
  const a = path.split('/');
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith('[')) params[p[i].slice(1, -1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

export function createTestServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url!, 'http://localhost');

    for (const route of routes) {
      const params = match(route.pattern, url.pathname);
      const handler = params && route.mod[req.method!];
      if (!handler) continue;

      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const hasBody = !['GET', 'HEAD'].includes(req.method!) && chunks.length > 0;

      const nextReq = new NextRequest(url, {
        method: req.method,
        headers: req.headers as HeadersInit,
        body: hasBody ? Buffer.concat(chunks) : undefined,
      });
      const response = await handler(nextReq, { params: Promise.resolve(params) });

      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        if (key !== 'set-cookie') res.setHeader(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader('set-cookie', cookies);
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    res.statusCode = 404;
    res.end();
  });
}