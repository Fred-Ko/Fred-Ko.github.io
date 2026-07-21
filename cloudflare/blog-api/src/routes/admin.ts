import { error, json, readJson } from '../http';
import { requireAdmin } from '../services/auth';
import type { Env } from '../types';

interface AdminCommentRow {
  id: string;
  post_id: string;
  parent_id: string | null;
  content_markdown: string;
  content_html: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  login: string;
  display_name: string;
  avatar_url: string;
  profile_url: string;
}

export async function handleAdminComments(
  request: Request,
  env: Env,
  commentId?: string
): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  if (!commentId && request.method === 'GET') {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'pending';
    if (!['pending', 'published', 'hidden', 'deleted', 'all'].includes(status)) {
      return error('유효하지 않은 댓글 상태입니다.');
    }
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 100);
    const statement = status === 'all'
      ? env.DB.prepare(`${selectComments()} ORDER BY c.created_at DESC LIMIT ?1`).bind(limit)
      : env.DB.prepare(`${selectComments()} WHERE c.status = ?1 ORDER BY c.created_at DESC LIMIT ?2`).bind(status, limit);
    const result = await statement.all<AdminCommentRow>();
    return json({ comments: result.results ?? [] });
  }

  if (!commentId) return error('댓글 ID가 필요합니다.', 400);
  const existing = await env.DB.prepare('SELECT post_id, status FROM comments WHERE id = ?1')
    .bind(commentId)
    .first<{ post_id: string; status: string }>();
  if (!existing) return error('댓글을 찾을 수 없습니다.', 404);

  if (request.method === 'PATCH') {
    let body: { status?: string };
    try {
      body = await readJson<{ status?: string }>(request);
    } catch (caught) {
      return error(caught instanceof Error ? caught.message : '잘못된 요청입니다.');
    }
    if (!body.status || !['pending', 'published', 'hidden'].includes(body.status)) {
      return error('상태는 pending, published, hidden 중 하나여야 합니다.');
    }
    await env.DB.prepare('UPDATE comments SET status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2')
      .bind(body.status, commentId)
      .run();
    await adjustCountForStatusChange(env, existing.post_id, existing.status, body.status);
    return json({ ok: true, status: body.status });
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare(
      `UPDATE comments SET status = 'deleted', content_markdown = '',
       content_html = '<p>삭제된 댓글입니다.</p>', updated_at = CURRENT_TIMESTAMP WHERE id = ?1`
    )
      .bind(commentId)
      .run();
    await adjustCountForStatusChange(env, existing.post_id, existing.status, 'deleted');
    return json({ ok: true });
  }

  return error('지원하지 않는 요청입니다.', 405);
}

function selectComments(): string {
  return `SELECT c.id, c.post_id, c.parent_id, c.content_markdown, c.content_html,
    c.status, c.created_at, c.updated_at, u.id AS user_id, u.login,
    u.display_name, u.avatar_url, u.profile_url
    FROM comments c JOIN users u ON u.id = c.user_id`;
}

async function adjustCountForStatusChange(
  env: Env,
  postId: string,
  previous: string,
  next: string
): Promise<void> {
  if (previous === next || (previous !== 'published' && next !== 'published')) return;
  const delta = next === 'published' ? 1 : -1;
  await env.DB.prepare(
    `INSERT INTO post_stats (post_id, comment_count) VALUES (?1, MAX(?2, 0))
     ON CONFLICT(post_id) DO UPDATE SET
       comment_count = MAX(comment_count + ?2, 0), updated_at = CURRENT_TIMESTAMP`
  )
    .bind(postId, delta)
    .run();
}
