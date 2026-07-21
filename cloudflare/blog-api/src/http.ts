import type { Env } from './types';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  });
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function redirect(location: string, headers?: HeadersInit): Response {
  return new Response(null, {
    status: 302,
    headers: { location, 'cache-control': 'no-store', ...headers }
  });
}

export function parseCookies(request: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    cookies.set(part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim()));
  }
  return cookies;
}

export function cookie(
  name: string,
  value: string,
  options: { maxAge?: number; httpOnly?: boolean; path?: string; secure?: boolean } = {}
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? '/'}`,
    'SameSite=Lax'
  ];
  if (options.secure !== false) parts.push('Secure');
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  return parts.join('; ');
}

export function deleteCookie(name: string, path = '/', secure = true): string {
  return `${name}=; Path=${path}; Max-Age=0; SameSite=Lax;${secure ? ' Secure;' : ''} HttpOnly`;
}

export function isAllowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const requestOrigin = new URL(request.url).origin;
  if (origin === requestOrigin || origin === env.SITE_URL) return true;

  return /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);
}

export async function readJson<T>(request: Request, maxBytes = 12_000): Promise<T> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > maxBytes) throw new Error('요청 본문이 너무 큽니다.');

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new Error('요청 본문이 너무 큽니다.');
  }
  return JSON.parse(text) as T;
}
