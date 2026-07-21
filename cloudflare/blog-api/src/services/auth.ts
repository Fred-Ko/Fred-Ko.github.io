import { cookie, deleteCookie, error, json, parseCookies } from '../http';
import type { Env, GitHubUser, User } from '../types';
import { codeChallenge, randomToken, sha256 } from './crypto';

const SESSION_COOKIE = 'fredko_session';
const OAUTH_STATE_COOKIE = 'fredko_oauth_state';
const OAUTH_VERIFIER_COOKIE = 'fredko_oauth_verifier';
const OAUTH_RETURN_COOKIE = 'fredko_oauth_return';

export async function startGitHubLogin(request: Request, env: Env): Promise<Response> {
  if (!oauthConfigured(env)) {
    return error('GitHub 로그인이 아직 설정되지 않았습니다.', 503);
  }

  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get('return_to'), env.SITE_URL);
  const state = randomToken();
  const verifier = randomToken(48);
  const challenge = await codeChallenge(verifier);
  const callback = `${env.SITE_URL}/api/auth/github/callback`;
  const secure = new URL(env.SITE_URL).protocol === 'https:';

  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', callback);
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('scope', '');
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');

  const headers = new Headers({ location: authorize.toString(), 'cache-control': 'no-store' });
  headers.append('set-cookie', cookie(OAUTH_STATE_COOKIE, state, { maxAge: 600, path: '/api/auth/github', secure }));
  headers.append('set-cookie', cookie(OAUTH_VERIFIER_COOKIE, verifier, { maxAge: 600, path: '/api/auth/github', secure }));
  headers.append('set-cookie', cookie(OAUTH_RETURN_COOKIE, returnTo, { maxAge: 600, path: '/api/auth/github', secure }));
  return new Response(null, { status: 302, headers });
}

export async function finishGitHubLogin(request: Request, env: Env): Promise<Response> {
  if (!oauthConfigured(env)) {
    return error('GitHub 로그인이 아직 설정되지 않았습니다.', 503);
  }

  const url = new URL(request.url);
  const cookies = parseCookies(request);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const savedState = cookies.get(OAUTH_STATE_COOKIE);
  const verifier = cookies.get(OAUTH_VERIFIER_COOKIE);
  const returnTo = safeReturnTo(cookies.get(OAUTH_RETURN_COOKIE), env.SITE_URL);
  const secure = new URL(env.SITE_URL).protocol === 'https:';

  if (!state || !code || !savedState || state !== savedState || !verifier) {
    return error('유효하지 않은 로그인 요청입니다.', 400);
  }

  const callback = `${env.SITE_URL}/api/auth/github/callback`;
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callback,
      code_verifier: verifier
    })
  });
  const tokenBody = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!tokenResponse.ok || !tokenBody.access_token) {
    return error('GitHub 인증 토큰을 가져오지 못했습니다.', 502);
  }

  const profileResponse = await fetch('https://api.github.com/user', {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${tokenBody.access_token}`,
      'user-agent': 'fredko-blog',
      'x-github-api-version': '2022-11-28'
    }
  });
  if (!profileResponse.ok) return error('GitHub 사용자 정보를 가져오지 못했습니다.', 502);
  const profile = (await profileResponse.json()) as GitHubUser;
  const user = await upsertGitHubUser(env, profile);

  const sessionToken = randomToken(48);
  const tokenHash = await sha256(sessionToken);
  const ttlDays = Math.min(Math.max(Number(env.SESSION_TTL_DAYS ?? 30), 1), 90);
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?1, ?2, ?3)')
    .bind(tokenHash, user.id, expiresAt)
    .run();

  const headers = new Headers({ location: returnTo, 'cache-control': 'no-store' });
  headers.append('set-cookie', cookie(SESSION_COOKIE, sessionToken, { maxAge: ttlDays * 86_400, secure }));
  headers.append('set-cookie', deleteCookie(OAUTH_STATE_COOKIE, '/api/auth/github', secure));
  headers.append('set-cookie', deleteCookie(OAUTH_VERIFIER_COOKIE, '/api/auth/github', secure));
  headers.append('set-cookie', deleteCookie(OAUTH_RETURN_COOKIE, '/api/auth/github', secure));
  return new Response(null, { status: 302, headers });
}

export async function currentUser(request: Request, env: Env): Promise<User | null> {
  const token = parseCookies(request).get(SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  return env.DB.prepare(
    `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?1 AND datetime(s.expires_at) > datetime('now')`
  )
    .bind(tokenHash)
    .first<User>();
}

export async function sessionResponse(request: Request, env: Env): Promise<Response> {
  const user = await currentUser(request, env);
  return json({ user: user ? publicUser(user) : null });
}

export async function logout(request: Request, env: Env): Promise<Response> {
  const token = parseCookies(request).get(SESSION_COOKIE);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1')
      .bind(await sha256(token))
      .run();
  }
  const secure = new URL(env.SITE_URL).protocol === 'https:';
  return json({ ok: true }, 200, { 'set-cookie': deleteCookie(SESSION_COOKIE, '/', secure) });
}

export function publicUser(user: User): Pick<User, 'id' | 'login' | 'display_name' | 'avatar_url' | 'profile_url' | 'role'> {
  return {
    id: user.id,
    login: user.login,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    profile_url: user.profile_url,
    role: user.role
  };
}

export async function requireUser(request: Request, env: Env): Promise<User | Response> {
  return (await currentUser(request, env)) ?? error('GitHub 로그인이 필요합니다.', 401);
}

export async function requireAdmin(request: Request, env: Env): Promise<User | Response> {
  const user = await currentUser(request, env);
  if (user?.role === 'admin') return user;

  const key = request.headers.get('x-admin-api-key');
  if (key && env.ADMIN_API_KEY && (await sha256(key)) === (await sha256(env.ADMIN_API_KEY))) {
    return {
      id: 'api-admin',
      provider: 'internal',
      provider_user_id: 'api-admin',
      login: 'api-admin',
      display_name: 'API Admin',
      avatar_url: '',
      profile_url: '',
      role: 'admin'
    };
  }
  return error('관리자 권한이 필요합니다.', user ? 403 : 401);
}

async function upsertGitHubUser(env: Env, profile: GitHubUser): Promise<User> {
  const id = `github:${profile.id}`;
  const admins = new Set(
    (env.ADMIN_GITHUB_LOGINS ?? '')
      .split(',')
      .map((login) => login.trim().toLowerCase())
      .filter(Boolean)
  );
  const role = admins.has(profile.login.toLowerCase()) ? 'admin' : 'user';
  await env.DB.prepare(
    `INSERT INTO users
       (id, provider, provider_user_id, login, display_name, avatar_url, profile_url, role)
     VALUES (?1, 'github', ?2, ?3, ?4, ?5, ?6, ?7)
     ON CONFLICT(provider, provider_user_id) DO UPDATE SET
       login = excluded.login,
       display_name = excluded.display_name,
       avatar_url = excluded.avatar_url,
       profile_url = excluded.profile_url,
       role = excluded.role,
       updated_at = CURRENT_TIMESTAMP`
  )
    .bind(
      id,
      String(profile.id),
      profile.login,
      profile.name?.trim() || profile.login,
      profile.avatar_url,
      profile.html_url,
      role
    )
    .run();
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(id).first<User>();
  if (!user) throw new Error('사용자 저장에 실패했습니다.');
  return user;
}

function safeReturnTo(value: string | null | undefined, siteUrl: string): string {
  try {
    const target = new URL(value || '/', siteUrl);
    const site = new URL(siteUrl);
    const localDevelopment = ['127.0.0.1', 'localhost'].includes(site.hostname) &&
      ['127.0.0.1', 'localhost'].includes(target.hostname);
    return target.origin === site.origin || localDevelopment ? target.toString() : siteUrl;
  } catch {
    return siteUrl;
  }
}

function oauthConfigured(env: Env): boolean {
  return Boolean(env.GITHUB_CLIENT_ID?.trim() && env.GITHUB_CLIENT_SECRET?.trim());
}
