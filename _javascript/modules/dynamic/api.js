export class BlogApi {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async request(path, options = {}) {
    const headers = { ...(options.headers ?? {}) };
    if (options.body) headers['content-type'] = 'application/json';
    const response = await fetch(`${this.baseUrl}${path}`, {
      credentials: 'include',
      headers,
      ...options
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const requestError = new Error(body.error ?? '요청을 처리하지 못했습니다.');
      requestError.status = response.status;
      throw requestError;
    }
    return body;
  }

  session() {
    return this.request('/auth/session');
  }

  stats(postId) {
    return this.request(`/posts/${encodeURIComponent(postId)}/stats`);
  }

  recordView(postId) {
    return this.request(`/posts/${encodeURIComponent(postId)}/view`, { method: 'POST' });
  }

  comments(postId, cursor = null) {
    const suffix = cursor ? `?before=${encodeURIComponent(cursor)}` : '';
    return this.request(`/posts/${encodeURIComponent(postId)}/comments${suffix}`);
  }

  createComment(postId, content) {
    return this.request(`/posts/${encodeURIComponent(postId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  updateComment(commentId, content) {
    return this.request(`/comments/${encodeURIComponent(commentId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ content })
    });
  }

  deleteComment(commentId) {
    return this.request(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
  }

  setLike(postId, liked) {
    return this.request(`/posts/${encodeURIComponent(postId)}/like`, {
      method: liked ? 'DELETE' : 'PUT'
    });
  }

  logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }
}
