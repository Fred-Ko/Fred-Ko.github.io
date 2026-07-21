# Fredko 동적 블로그 개발 가이드

Jekyll은 Markdown 게시물을 정적 HTML로 만들고, `cloudflare/blog-api`의 Worker와 D1이 조회수, 순 방문자, 좋아요, GitHub 로그인, 댓글을 처리한다. 게시물 원본은 계속 Git 저장소만 사용하며 웹 작성 기능은 제공하지 않는다.

## 구성

- 정적 사이트: Jekyll + Fredko 로컬 테마
- API: Cloudflare Workers
- 데이터베이스: Cloudflare D1
- 인증: GitHub OAuth authorization-code flow + PKCE
- 세션: D1에 SHA-256 해시만 저장하는 HttpOnly 쿠키 세션
- 댓글 본문: 안전한 Markdown 일부 문법만 서버에서 HTML로 변환

GitHub access token은 로그인할 때 프로필을 확인하는 데만 사용하며 DB에 저장하지 않는다. OAuth scope도 요청하지 않는다.

## 게시물 작성

모든 게시물 front matter에는 한번 정한 `post_id`가 있어야 한다.

```yaml
---
post_id: 019c8d93-821e-7000-a472-7f694c848061
title: 게시물 제목
---
```

파일명, 제목, permalink를 변경해도 `post_id`는 변경하지 않는다. `_plugins/validate-post-id.rb`가 누락, 잘못된 UUID, 중복을 빌드 단계에서 차단한다.

새 ID는 다음 명령으로 만들 수 있다.

```bash
uuidgen --time-v7
```

## 로컬 실행

루트 의존성과 API 의존성을 설치한다.

```bash
mise run setup
cd cloudflare/blog-api
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
```

`.dev.vars`에 로컬 GitHub OAuth 앱의 ID와 secret을 입력한다. 로컬 OAuth 앱은 다음 값을 사용한다.

```text
Homepage URL: http://127.0.0.1:8787
Authorization callback URL: http://127.0.0.1:8787/api/auth/github/callback
```

로컬 인증을 시험할 때는 `wrangler.jsonc`의 `SITE_URL`을 별도 개발 환경 설정에서 `http://127.0.0.1:8787`로 덮어써야 한다. 일반 API 개발에는 OAuth secret 없이도 health, 통계 조회, 조회수 기록을 시험할 수 있다.

두 터미널에서 실행한다.

```bash
# Terminal 1
bundle exec jekyll serve \
  --config _config.yml,_config.development.yml \
  --livereload

# Terminal 2
cd cloudflare/blog-api
npm run dev
```

검증 명령은 다음과 같다.

```bash
npm run build:js
bundle exec jekyll build

cd cloudflare/blog-api
npm run typecheck
npm test
```

## Cloudflare 리소스 생성

Cloudflare에 로그인한 다음 D1을 만든다.

```bash
cd cloudflare/blog-api
npx wrangler login
npx wrangler d1 create fredko-blog
```

출력된 `database_id`를 `wrangler.jsonc`의 placeholder와 교체한다. 이어서 secret과 migration을 등록한다.

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put VISITOR_HASH_SALT
npx wrangler secret put ADMIN_API_KEY
npm run db:migrate:remote
npm run deploy
```

운영 GitHub OAuth 앱에는 다음 값을 등록한다.

```text
Homepage URL: https://fredko.kr
Authorization callback URL: https://fredko.kr/api/auth/github/callback
```

`ADMIN_GITHUB_LOGINS`에 지정된 GitHub login은 로그인할 때 관리자 역할을 받는다. 여러 명이면 쉼표로 구분한다.

## API

```text
GET    /api/health
GET    /api/auth/github/start
GET    /api/auth/github/callback
GET    /api/auth/session
POST   /api/auth/logout

GET    /api/posts/:postId/stats
POST   /api/posts/:postId/view
PUT    /api/posts/:postId/like
DELETE /api/posts/:postId/like
GET    /api/posts/:postId/comments
POST   /api/posts/:postId/comments
PATCH  /api/comments/:commentId
DELETE /api/comments/:commentId

GET    /api/admin/comments
PATCH  /api/admin/comments/:commentId
DELETE /api/admin/comments/:commentId
```

좋아요는 로그인 없이 브라우저별 익명 쿠키로 추가·취소할 수 있다. 쿠키 원문은 DB에 저장하지 않고 salt를 포함한 SHA-256 해시만 저장한다. 댓글 작성·수정·삭제에는 로그인이 필요하다. 작성자는 자신의 댓글만 수정·삭제할 수 있고 관리자는 모든 댓글의 공개 상태를 관리할 수 있다. 관리자 API는 브라우저 세션 외에 `x-admin-api-key`도 지원하므로 초기에는 별도 관리자 UI 없이 사용할 수 있다.

조회수도 같은 익명 브라우저 해시를 사용하며, 같은 게시물은 30분에 한 번만 증가한다. 새로고침 반복은 차단하지만 쿠키 삭제나 별도 브라우저까지 동일 사용자로 추적하지는 않는다.

## 배포 순서

1. Worker와 D1을 먼저 배포한다.
2. `/api/health`와 GitHub 로그인을 확인한다.
3. 기존 GitHub Pages에서 API 연동을 검증한다.
4. Cloudflare Pages에 `_site`를 배포한다.
5. `fredko.kr`을 Pages에 연결한다.
6. Worker route `fredko.kr/api/*`가 API를 우선 처리하는지 확인한다.
7. 검증 후 기존 GitHub Pages 배포 workflow를 중단한다.

현재 저장소의 GitHub Pages workflow는 안전한 이전을 위해 그대로 유지되어 있다.
