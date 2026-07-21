import { BlogApi } from './api';

export function initDynamicBlog() {
  const root = document.querySelector('#dynamic-blog');
  const article = document.querySelector('article[data-post-id]');
  if (!root || !article) return;

  const postId = article.dataset.postId;
  const api = new BlogApi(root.dataset.apiBase || '/api');
  const state = { user: null, liked: false, cursor: null };
  const form = root.querySelector('[data-comment-form]');
  const textarea = form.querySelector('textarea');
  const list = root.querySelector('[data-comments-list]');
  const loadMore = root.querySelector('[data-load-more]');
  const likeButton = root.querySelector('[data-action="like"]');
  const oauthEnabled = root.dataset.oauthEnabled !== 'false';

  const showNotice = (message, isError = false) => {
    const notice = root.querySelector('[data-notice]');
    notice.textContent = message;
    notice.classList.toggle('is-error', isError);
    notice.hidden = !message;
  };

  const updateStats = (stats) => {
    for (const name of ['views', 'likes', 'comments']) {
      root.querySelector(`[data-stat="${name}"]`).textContent = Number(stats[name]).toLocaleString('ko-KR');
    }
    state.liked = Boolean(stats.liked);
    likeButton.setAttribute('aria-pressed', String(state.liked));
    likeButton.querySelector('i').className = `${state.liked ? 'fas' : 'far'} fa-heart fa-fw`;
  };

  const loginUrl = () => {
    const returnTo = encodeURIComponent(window.location.href);
    return `${root.dataset.apiBase || '/api'}/auth/github/start?return_to=${returnTo}`;
  };

  const renderAuth = () => {
    const container = root.querySelector('[data-auth-state]');
    container.replaceChildren();
    if (!state.user) {
      if (!oauthEnabled) {
        const localNotice = document.createElement('span');
        localNotice.className = 'text-muted small';
        localNotice.textContent = 'GitHub 로그인은 운영 환경에서 사용할 수 있습니다.';
        container.append(localNotice);
        form.hidden = true;
        return;
      }

      const link = document.createElement('a');
      link.className = 'btn btn-outline-secondary btn-sm';
      link.href = loginUrl();
      link.innerHTML = '<i class="fab fa-github fa-fw"></i> GitHub 로그인';
      container.append(link);
      form.hidden = true;
      return;
    }

    const profile = document.createElement('a');
    profile.href = state.user.profile_url;
    profile.target = '_blank';
    profile.rel = 'noopener';
    profile.textContent = state.user.display_name;
    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'btn btn-link btn-sm';
    logout.textContent = '로그아웃';
    logout.addEventListener('click', async () => {
      await api.logout();
      state.user = null;
      renderAuth();
      await loadStats();
    });
    container.append(profile, logout);
    form.hidden = false;
  };

  const renderComment = (comment) => {
    const item = document.createElement('article');
    item.className = 'dynamic-comment';
    item.dataset.commentId = comment.id;
    const avatar = document.createElement('img');
    avatar.className = 'dynamic-comment-avatar';
    avatar.src = comment.author.avatar_url;
    avatar.alt = '';
    avatar.width = 40;
    avatar.height = 40;
    avatar.loading = 'lazy';
    const body = document.createElement('div');
    body.className = 'dynamic-comment-body';
    const header = document.createElement('div');
    header.className = 'dynamic-comment-header';
    const author = document.createElement('a');
    author.href = comment.author.profile_url;
    author.target = '_blank';
    author.rel = 'noopener';
    author.textContent = comment.author.display_name;
    const time = document.createElement('time');
    time.dateTime = comment.created_at;
    time.textContent = formatDate(comment.created_at);
    header.append(author, time);
    const content = document.createElement('div');
    content.className = 'dynamic-comment-content';
    content.innerHTML = comment.content_html;
    body.append(header, content);

    if (state.user && (state.user.id === comment.author.id || state.user.role === 'admin')) {
      const actions = document.createElement('div');
      actions.className = 'dynamic-comment-actions';
      const edit = actionButton('수정', async () => {
        const next = window.prompt('댓글 수정', comment.content_markdown);
        if (next === null || next.trim() === comment.content_markdown) return;
        await api.updateComment(comment.id, next.trim());
        await loadComments(false);
        showNotice('댓글을 수정했습니다.');
      });
      const remove = actionButton('삭제', async () => {
        if (!window.confirm('이 댓글을 삭제할까요?')) return;
        await api.deleteComment(comment.id);
        item.remove();
        await loadStats();
      });
      actions.append(edit, remove);
      body.append(actions);
    }
    item.append(avatar, body);
    return item;
  };

  const actionButton = (label, handler) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-link btn-sm';
    button.textContent = label;
    button.addEventListener('click', () => handler().catch((caught) => showNotice(caught.message, true)));
    return button;
  };

  const loadStats = async () => updateStats(await api.stats(postId));

  const loadComments = async (append = false) => {
    const response = await api.comments(postId, append ? state.cursor : null);
    if (!append) list.replaceChildren();
    for (const comment of response.comments) list.append(renderComment(comment));
    if (!append && response.comments.length === 0) showEmptyComments(list);
    state.cursor = response.next_cursor;
    loadMore.hidden = !state.cursor;
  };

  likeButton.addEventListener('click', async () => {
    likeButton.disabled = true;
    try {
      updateStats(await api.setLike(postId, state.liked));
    } catch (caught) {
      showNotice(caught.message, true);
    } finally {
      likeButton.disabled = false;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const result = await api.createComment(postId, textarea.value);
      textarea.value = '';
      showNotice(result.status === 'pending' ? '승인 후 댓글이 공개됩니다.' : '댓글을 등록했습니다.');
      await Promise.all([loadComments(false), loadStats()]);
    } catch (caught) {
      showNotice(caught.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  loadMore.addEventListener('click', () => {
    loadComments(true).catch((caught) => showNotice(caught.message, true));
  });

  Promise.all([api.session(), api.stats(postId), api.comments(postId)])
    .then(([session, stats, commentResponse]) => {
      state.user = session.user;
      updateStats(stats);
      renderAuth();
      list.replaceChildren(...commentResponse.comments.map(renderComment));
      if (commentResponse.comments.length === 0) showEmptyComments(list);
      state.cursor = commentResponse.next_cursor;
      loadMore.hidden = !state.cursor;
    })
    .catch((caught) => showNotice(caught.message, true));

  window.setTimeout(() => {
    api.recordView(postId).then(updateStats).catch(() => {});
  }, Number(root.dataset.viewDelay || 8000));
}

function showEmptyComments(list) {
  const empty = document.createElement('p');
  empty.className = 'text-muted';
  empty.textContent = '첫 댓글을 남겨보세요.';
  list.append(empty);
}

function formatDate(value) {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(normalized));
}
