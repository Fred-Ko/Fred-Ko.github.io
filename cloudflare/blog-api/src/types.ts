export interface Env {
  DB: D1Database;
  SITE_URL: string;
  SESSION_TTL_DAYS?: string;
  COMMENTS_REQUIRE_APPROVAL?: string;
  ADMIN_GITHUB_LOGINS?: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  VISITOR_HASH_SALT: string;
  ADMIN_API_KEY?: string;
}

export interface User {
  id: string;
  provider: string;
  provider_user_id: string;
  login: string;
  display_name: string;
  avatar_url: string;
  profile_url: string;
  role: 'user' | 'admin';
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export interface RequestContext {
  request: Request;
  env: Env;
  url: URL;
}
