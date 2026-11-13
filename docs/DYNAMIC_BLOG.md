# Fredko 동적 블로그 개발 가이드

Astro는 정적 사이트를 만들고, `cloudflare/blog-api`의 Worker와 D1이 조회수, 순 방문자, 좋아요, GitHub 로그인, 댓글을 처리한다. 게시물 원본은 계속 Git 저장소만 사용하며 웹 작성 기능은 제공하지 않는다.

## 구성

- 정적 사이트: Astro + Fredko 디자인 시스템
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

파일명, 제목, permalink를 변경해도 `post_id`는 변경하지 않는다. 기존 Jekyll 검증 플러그인은 Astro `posts` 컬렉션의 스키마와 로더로 대체했다. 누락, 잘못된 UUID, 중복은 빌드 단계에서 차단한다. 원고 28개와 기존 글 라우트를 이전했다. 공개 정책은 [글 컬렉션 규칙](CONTENT.md)을 참고한다.

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
# 터미널 1
npm run build
npm run preview

# 터미널 2
cd cloudflare/blog-api
npm run dev -- --port 8788 --var VISITOR_HASH_SALT:local-review-only --var SITE_URL:http://127.0.0.1:4400
```

검증 명령은 다음과 같다.

```bash
npm test
npm run build

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

## Astro 배포와 연결

GitHub Pages 워크플로는 Node 24에서 Astro를 빌드하고 `dist/`를 배포한다. `/api/posts/:postId/*`와 `/api/auth/*`, `/api/comments/*` 경로 및 Cloudflare D1은 기존 구성을 유지한다.

루트의 `npm run preview`는 빌드 결과와 로컬 Worker API를 같은 출처 `http://127.0.0.1:4400`로 제공한다. `/api`의 기본 대상은 `http://127.0.0.1:8788`이다. Astro 개발 서버도 같은 로컬 API로 프록시한다.

실제 GitHub OAuth 승인을 완료하는 검증은 사용자의 GitHub 계정과 올바른 앱 자격 증명이 필요하다. 자동 브라우저 시험은 가상 로그인 세션으로 댓글 작성·수정·삭제·로그아웃을 확인하고, 익명 통계·좋아요·조회수는 실제 로컬 D1에 연결한다. 운영 로그인 시작 경로의 302 응답은 별도로 확인했다.
