import { describe, expect, it } from 'vitest';
import { startGitHubLogin } from '../src/services/auth';
import type { Env } from '../src/types';

describe('GitHub OAuth start', () => {
  it('sets PKCE and state cookies and redirects to GitHub', async () => {
    const env = {
      SITE_URL: 'https://fredko.kr',
      GITHUB_CLIENT_ID: 'test-client',
      GITHUB_CLIENT_SECRET: 'test-secret'
    } as Env;
    const response = await startGitHubLogin(
      new Request('https://fredko.kr/api/auth/github/start?return_to=%2Fposts%2Ftest%2F'),
      env
    );
    const location = new URL(response.headers.get('location') ?? '');

    expect(response.status).toBe(302);
    expect(location.origin).toBe('https://github.com');
    expect(location.searchParams.get('client_id')).toBe('test-client');
    expect(location.searchParams.get('state')).toBeTruthy();
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('code_challenge')).toHaveLength(43);
    expect(response.headers.getSetCookie()).toHaveLength(3);
  });

  it('does not accept an external return URL', async () => {
    const env = {
      SITE_URL: 'https://fredko.kr',
      GITHUB_CLIENT_ID: 'test-client',
      GITHUB_CLIENT_SECRET: 'test-secret'
    } as Env;
    const response = await startGitHubLogin(
      new Request('https://fredko.kr/api/auth/github/start?return_to=https://example.com/steal'),
      env
    );
    const returnCookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith('fredko_oauth_return='));

    expect(decodeURIComponent(returnCookie ?? '')).toContain('https://fredko.kr');
    expect(returnCookie).not.toContain('example.com');
  });

  it('returns service unavailable when OAuth secrets are missing', async () => {
    const response = await startGitHubLogin(
      new Request('https://fredko.kr/api/auth/github/start'),
      { SITE_URL: 'https://fredko.kr' } as Env
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'GitHub 로그인이 아직 설정되지 않았습니다.'
    });
  });
});
