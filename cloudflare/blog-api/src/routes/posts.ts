import { cookie, error, json, parseCookies, readJson } from '../http';
import { publicUser, requireUser } from '../services/auth';
import { randomToken, sha256 } from '../services/crypto';
import { renderCommentMarkdown } from '../services/markdown';
import type { Env, User } from '../types';

const POST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ANONYMOUS_ACTOR_COOKIE = 'fredko_visitor';
const ANONYMOUS_COOKIE_MAX_AGE = 365 * 86_400;
const VIEW_COOLDOWN_SECONDS = 30 * 60;

interface CommentBody {
  content?: string;
  parent_id?: string | null;
}

interface CommentRow {
  id: string;
  post_id: string;
  parent_id: string | null;
  content_markdown: string;
  content_html: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  login: string;
  display_name: string;
  avatar_url: string;
  profile_url: string;
  role: User['role'];
}

interface AnonymousActor {
  hash: string;
  setCookie?: string;
}

export async function handlePostRoute(
  request: Request,
  env: Env,
  postId: string,
  action: string
): Promise<Response> {
  if (!POST_ID_PATTERN.test(postId)) return error('유효하지 않은 post_id입니다.', 400);

  if (action === 'stats' && request.method === 'GET') return stats(request, env, postId);
  if (action === 'view' && request.method === 'POST') return recordView(request, env, postId);
  if (action === 'like' && request.method === 'PUT') return like(request, env, postId);
  if (action === 'like' && request.method === 'DELETE') return unlike(request, env, postId);
  if (action === 'comments' && request.method === 'GET') return comments(request, env, postId);
  if (action === 'comments' && request.method === 'POST') return createComment(request, env, postId);
  return error('지원하지 않는 요청입니다.', 405);
}

async function stats(
  request: Request,
  env: Env,
  postId: string,
  existingActor?: AnonymousActor
): Promise<Response> {
  const actor = existingActor ?? await anonymousActorFor(request, env);
  const [row, likedRow] = await Promise.all([
    env.DB.prepare(
      `SELECT view_count, visitor_count, like_count, comment_count
         FROM post_stats WHERE post_id = ?1`
    )
      .bind(postId)
      .first<{
        view_count: number;
        visitor_count: number;
        like_count: number;
        comment_count: number;
      }>(),
    env.DB.prepare(
      'SELECT 1 AS found FROM anonymous_likes WHERE post_id = ?1 AND actor_hash = ?2'
    )
      .bind(postId, actor.hash)
      .first()
  ]);
  return json(
    {
      views: row?.view_count ?? 0,
      visitors: row?.visitor_count ?? 0,
      likes: row?.like_count ?? 0,
      comments: row?.comment_count ?? 0,
      liked: Boolean(likedRow)
    },
    200,
    actor.setCookie ? { 'set-cookie': actor.setCookie } : undefined
  );
}

async function recordView(request: Request, env: Env, postId: string): Promise<Response> {
  const actor = await anonymousActorFor(request, env);
  const recentView = await env.DB.prepare(
    `INSERT INTO recent_views (post_id, actor_hash, viewed_at)
     VALUES (?1, ?2, unixepoch())
     ON CONFLICT(post_id, actor_hash) DO UPDATE SET
       viewed_at = excluded.viewed_at
     WHERE recent_views.viewed_at <= unixepoch() - ?3`
  )
    .bind(postId, actor.hash, VIEW_COOLDOWN_SECONDS)
    .run();
  const counted = (recentView.meta.changes ?? 0) > 0 ? 1 : 0;

  const visitDate = new Date().toISOString().slice(0, 10);
  const visit = await env.DB.prepare(
    `INSERT OR IGNORE INTO daily_visitors (post_id, visitor_hash, visit_date)
     VALUES (?1, ?2, ?3)`
  )
    .bind(postId, actor.hash, visitDate)
    .run();
  const unique = (visit.meta.changes ?? 0) > 0 ? 1 : 0;

  if (counted || unique) {
    await env.DB.prepare(
      `INSERT INTO post_stats (post_id, view_count, visitor_count)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(post_id) DO UPDATE SET
         view_count = view_count + ?2,
         visitor_count = visitor_count + ?3,
         updated_at = CURRENT_TIMESTAMP`
    )
      .bind(postId, counted, unique)
      .run();
  }
  return stats(request, env, postId, actor);
}

async function like(request: Request, env: Env, postId: string): Promise<Response> {
  const actor = await anonymousActorFor(request, env);
  const result = await env.DB.prepare(
    'INSERT OR IGNORE INTO anonymous_likes (post_id, actor_hash) VALUES (?1, ?2)'
  )
    .bind(postId, actor.hash)
    .run();
  if ((result.meta.changes ?? 0) > 0) {
    await env.DB.prepare(
      `INSERT INTO post_stats (post_id, like_count) VALUES (?1, 1)
       ON CONFLICT(post_id) DO UPDATE SET
         like_count = like_count + 1, updated_at = CURRENT_TIMESTAMP`
    )
      .bind(postId)
      .run();
  }
  return stats(request, env, postId, actor);
}

async function unlike(request: Request, env: Env, postId: string): Promise<Response> {
  const actor = await anonymousActorFor(request, env);
  const result = await env.DB.prepare(
    'DELETE FROM anonymous_likes WHERE post_id = ?1 AND actor_hash = ?2'
  )
    .bind(postId, actor.hash)
    .run();
  if ((result.meta.changes ?? 0) > 0) {
    await env.DB.prepare(
      `UPDATE post_stats SET like_count = MAX(like_count - 1, 0), updated_at = CURRENT_TIMESTAMP
       WHERE post_id = ?1`
    )
      .bind(postId)
      .run();
  }
  return stats(request, env, postId, actor);
}

async function anonymousActorFor(request: Request, env: Env): Promise<AnonymousActor> {
  const savedToken = parseCookies(request).get(ANONYMOUS_ACTOR_COOKIE);
  const token = savedToken ?? randomToken(32);
  const hash = await sha256(`${env.VISITOR_HASH_SALT}|anonymous|${token}`);
  if (savedToken) return { hash };

  return {
    hash,
    setCookie: cookie(ANONYMOUS_ACTOR_COOKIE, token, {
      maxAge: ANONYMOUS_COOKIE_MAX_AGE,
      secure: new URL(request.url).protocol === 'https:'
    })
  };
}

async function comments(request: Request, env: Env, postId: string): Promise<Response> {
  const url = new URL(request.url);
  const before = parseCursor(url.searchParams.get('before'));
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 30), 1), 50);
  const statement = before
    ? env.DB.prepare(
        `${commentSelect()}
         WHERE c.post_id = ?1 AND c.status = 'published'
           AND (c.created_at < ?2 OR (c.created_at = ?2 AND c.id < ?3))
         ORDER BY c.created_at DESC, c.id DESC LIMIT ?4`
      ).bind(postId, before.createdAt, before.id, limit + 1)
    : env.DB.prepare(
        `${commentSelect()}
         WHERE c.post_id = ?1 AND c.status = 'published'
         ORDER BY c.created_at DESC, c.id DESC LIMIT ?2`
      ).bind(postId, limit + 1);
  const result = await statement.all<CommentRow>();
  const rows = result.results ?? [];
  const hasMore = rows.length > limit;
  const visible = rows.slice(0, limit);
  return json({
    comments: visible.map(serializeComment),
    next_cursor: hasMore ? cursorFor(visible.at(-1)) : null
  });
}

async function createComment(request: Request, env: Env, postId: string): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  let body: CommentBody;
  try {
    body = await readJson<CommentBody>(request);
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : '잘못된 요청입니다.');
  }
  const content = body.content?.trim() ?? '';
  if (content.length < 2) return error('댓글은 두 글자 이상 입력해 주세요.');
  if (content.length > 5000) return error('댓글은 5,000자까지 작성할 수 있습니다.');

  let parentId: string | null = null;
  if (body.parent_id) {
    const parent = await env.DB.prepare(
      `SELECT id FROM comments
       WHERE id = ?1 AND post_id = ?2 AND status = 'published'`
    )
      .bind(body.parent_id, postId)
      .first<{ id: string }>();
    if (!parent) return error('답글 대상 댓글을 찾을 수 없습니다.', 404);
    parentId = parent.id;
  }

  const id = crypto.randomUUID();
  const status = env.COMMENTS_REQUIRE_APPROVAL === 'true' && user.role !== 'admin' ? 'pending' : 'published';
  await env.DB.prepare(
    `INSERT INTO comments
       (id, post_id, user_id, parent_id, content_markdown, content_html, status)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(id, postId, user.id, parentId, content, renderCommentMarkdown(content), status)
    .run();

  if (status === 'published') await changeCommentCount(env, postId, 1);
  return json({ id, status }, 201);
}

export async function updateOwnComment(
  request: Request,
  env: Env,
  commentId: string
): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;
  const existing = await env.DB.prepare(
    'SELECT post_id, user_id, status FROM comments WHERE id = ?1'
  )
    .bind(commentId)
    .first<{ post_id: string; user_id: string; status: string }>();
  if (!existing) return error('댓글을 찾을 수 없습니다.', 404);
  if (existing.user_id !== user.id && user.role !== 'admin') return error('수정 권한이 없습니다.', 403);

  if (request.method === 'DELETE') {
    await env.DB.prepare(
      `UPDATE comments SET status = 'deleted', content_markdown = '',
         content_html = '<p>삭제된 댓글입니다.</p>', updated_at = CURRENT_TIMESTAMP WHERE id = ?1`
    )
      .bind(commentId)
      .run();
    if (existing.status === 'published') await changeCommentCount(env, existing.post_id, -1);
    return json({ ok: true });
  }

  let body: CommentBody;
  try {
    body = await readJson<CommentBody>(request);
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : '잘못된 요청입니다.');
  }
  const content = body.content?.trim() ?? '';
  if (content.length < 2 || content.length > 5000) return error('댓글은 2자 이상 5,000자 이하로 입력해 주세요.');
  await env.DB.prepare(
    `UPDATE comments SET content_markdown = ?1, content_html = ?2,
       updated_at = CURRENT_TIMESTAMP WHERE id = ?3`
  )
    .bind(content, renderCommentMarkdown(content), commentId)
    .run();
  return json({ ok: true });
}

function commentSelect(): string {
  return `SELECT c.id, c.post_id, c.parent_id, c.content_markdown, c.content_html,
    c.created_at, c.updated_at, u.id AS user_id, u.login, u.display_name,
    u.avatar_url, u.profile_url, u.role
    FROM comments c JOIN users u ON u.id = c.user_id`;
}

function serializeComment(row: CommentRow): object {
  return {
    id: row.id,
    post_id: row.post_id,
    parent_id: row.parent_id,
    content_markdown: row.content_markdown,
    content_html: row.content_html,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author: publicUser({
      id: row.user_id,
      provider: 'github',
      provider_user_id: '',
      login: row.login,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      profile_url: row.profile_url,
      role: row.role
    })
  };
}

function parseCursor(value: string | null): { createdAt: string; id: string } | null {
  if (!value) return null;
  const separator = value.lastIndexOf('|');
  if (separator < 1 || separator === value.length - 1) return null;
  return { createdAt: value.slice(0, separator), id: value.slice(separator + 1) };
}

function cursorFor(row: CommentRow | undefined): string | null {
  return row ? `${row.created_at}|${row.id}` : null;
}

async function changeCommentCount(env: Env, postId: string, amount: 1 | -1): Promise<void> {
  if (amount === 1) {
    await env.DB.prepare(
      `INSERT INTO post_stats (post_id, comment_count) VALUES (?1, 1)
       ON CONFLICT(post_id) DO UPDATE SET
         comment_count = comment_count + 1, updated_at = CURRENT_TIMESTAMP`
    )
      .bind(postId)
      .run();
    return;
  }
  await env.DB.prepare(
    `UPDATE post_stats SET comment_count = MAX(comment_count - 1, 0),
       updated_at = CURRENT_TIMESTAMP WHERE post_id = ?1`
  )
    .bind(postId)
    .run();
}
