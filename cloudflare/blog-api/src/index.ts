import { error, isAllowedOrigin, json } from './http';
import { handleAdminComments } from './routes/admin';
import { handlePostRoute, updateOwnComment } from './routes/posts';
import {
  finishGitHubLogin,
  logout,
  sessionResponse,
  startGitHubLogin
} from './services/auth';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (!isAllowedOrigin(request, env)) return error('허용되지 않은 요청 출처입니다.', 403);
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-origin': request.headers.get('origin') ?? env.SITE_URL,
            'access-control-allow-credentials': 'true',
            'access-control-allow-headers': 'content-type, x-admin-api-key',
            'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'access-control-max-age': '86400'
          }
        });
      }
      return withCors(await routeRequest(request, env), request, env);
    } catch (caught) {
      console.error(caught);
      return error('서버에서 요청을 처리하지 못했습니다.', 500);
    }
  }
} satisfies ExportedHandler<Env>;

async function routeRequest(request: Request, env: Env): Promise<Response> {
  const path = normalizePath(new URL(request.url).pathname);
  if (path === '/api/health' && request.method === 'GET') {
    return json({ ok: true, service: 'fredko-blog-api' });
  }
  if (path === '/api/auth/github/start' && request.method === 'GET') {
    return startGitHubLogin(request, env);
  }
  if (path === '/api/auth/github/callback' && request.method === 'GET') {
    return finishGitHubLogin(request, env);
  }
  if (path === '/api/auth/session' && request.method === 'GET') {
    return sessionResponse(request, env);
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    return logout(request, env);
  }

  const postMatch = path.match(/^\/api\/posts\/([^/]+)\/(stats|view|like|comments)$/);
  if (postMatch) {
    return handlePostRoute(request, env, decodeURIComponent(postMatch[1]), postMatch[2]);
  }
  const ownCommentMatch = path.match(/^\/api\/comments\/([^/]+)$/);
  if (ownCommentMatch && ['PATCH', 'DELETE'].includes(request.method)) {
    return updateOwnComment(request, env, decodeURIComponent(ownCommentMatch[1]));
  }
  const adminMatch = path.match(/^\/api\/admin\/comments(?:\/([^/]+))?$/);
  if (adminMatch) {
    return handleAdminComments(
      request,
      env,
      adminMatch[1] ? decodeURIComponent(adminMatch[1]) : undefined
    );
  }
  return error('API 경로를 찾을 수 없습니다.', 404);
}

function withCors(response: Response, request: Request, env: Env): Response {
  const origin = request.headers.get('origin');
  if (!origin || (origin !== env.SITE_URL && origin === new URL(request.url).origin)) return response;
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', origin);
  headers.set('access-control-allow-credentials', 'true');
  headers.append('vary', 'Origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function normalizePath(pathname: string): string {
  const normalized = pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return normalized || '/';
}
