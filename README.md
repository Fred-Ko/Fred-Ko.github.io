# Fredko Dev Log

[fredko.kr](https://fredko.kr)의 Astro 기반 블로그입니다. 원고는 Markdown·MDX로 관리하고, 조회수·좋아요·GitHub 댓글은 기존 Cloudflare Worker와 D1을 사용합니다.

## 로컬 실행

```bash
mise install
mise run setup
mise run serve
```

개발 서버는 `http://127.0.0.1:4321/`에서 실행합니다. 검색은 빌드 결과에 생성되므로 전체 기능 확인에는 다음 미리보기를 사용합니다.

```bash
mise run build
mise exec -- npm run preview
```

전체 사이트는 `http://127.0.0.1:4400/`에서 확인할 수 있습니다. 미리보기는 마지막으로 완성된 빌드를 메모리에 유지하고, Astro와 검색 빌드가 모두 성공해 `.build-ready`가 갱신된 뒤 새 결과를 제공합니다. 재빌드 중 `dist/`가 비워져도 열어 둔 글이 404로 바뀌지 않습니다. 미리보기 서버는 `/api` 요청을 로컬 Worker `http://127.0.0.1:8788`로 전달합니다. `PORT`와 `API_PROXY` 환경변수로 변경할 수 있습니다.

## API를 함께 실행하기

```bash
npm ci --prefix cloudflare/blog-api
npm run db:migrate:local --prefix cloudflare/blog-api
npm run dev --prefix cloudflare/blog-api -- --port 8788 \
  --var VISITOR_HASH_SALT:local-review-only \
  --var SITE_URL:http://127.0.0.1:4400
```

이 명령은 로컬 D1만 사용합니다. GitHub 실계정 로그인을 로컬에서 사용하려면 별도의 OAuth 앱 설정이 필요합니다. 운영 API의 경로·데이터·OAuth 콜백은 변경하지 않았습니다. [동적 기능 가이드](docs/DYNAMIC_BLOG.md)를 참고하세요.

## 원고 작성

- 작성 위치: `src/content/posts/<nanoId>.md` 또는 `.mdx`
- `post_id`는 기존 API 식별자이므로 제목이나 파일명을 바꿔도 유지합니다.
- 공개 URL은 `/<nanoId>/`입니다.
- `published: false`, `draft: true`, 미래 날짜의 글은 공개 컬렉션에서 제외합니다.
- 필수 정보와 중복 식별자는 빌드에서 검증합니다.

[글 컬렉션 규칙](docs/CONTENT.md)과 [디자인 시스템](DESIGN_SYSTEM.md)에 필드·문법·컴포넌트 사용법이 있습니다. 기존 발행 도구의 입력은 `블로그/**/_posts/*.md`, 이미지는 `assets/img/`입니다. 빌드 전에 Astro 원고·공개 이미지로 자동 반영하며 삭제 글은 `_removed_posts/`에 보존합니다.

## 검증

```bash
npm run check:types
npm test
npm run build
npm run check:site
```

`check:site`는 현재 공개 MD·MDX 원고의 내부 링크·이미지·API ID·OG·댓글, 비공개 제외, RSS·사이트맵·검색 산출물을 검사합니다. 글 수를 28개로 고정하지 않습니다.

이전 당시 원문·화면과의 엄격한 대조는 `scripts/migration/`·`tests/migration/`로 분리했습니다. `npm run test:migration`과 `npm run check:baseline`으로 별도 실행하며 일반 CI에서는 실행하지 않습니다.

기존 발행 도구는 `블로그/`와 `assets/img/`에 계속 내보낼 수 있습니다. `prepare:content`가 새 글·수정·삭제를 반영하고, 같은 글을 Astro에서도 동시에 수정한 경우 덮어쓰지 않고 충돌을 알립니다. `master`에 푸시하면 검증·Astro 빌드·GitHub Pages 배포를 수행합니다.

브라우저 검증은 로컬 API를 먼저 실행한 후 수행합니다.

```bash
npx playwright install chromium firefox webkit
npm run test:browser
```

Chromium·Firefox·WebKit에서 검색, 테마, 모바일 메뉴, 코드 복사, 댓글 화면, 로컬 API, 서비스워커, 페이지 전환과 접근성을 검사합니다. 로그인한 댓글 화면은 가상 API 응답으로, 통계·좋아요·조회수·익명 댓글 차단은 실제 로컬 Worker로 검증합니다.

원본과의 차이 및 유지한 변경의 근거는 [요청 범위 검토](docs/migration/CHANGE_AUDIT.md)에 정리했습니다.

## 배포

`.github/workflows/pages-deploy.yml`은 `main`·`master` 푸시 시 Node 24로 타입·테스트·빌드·호환성 검사를 수행하고 `dist/`를 GitHub Pages에 배포합니다. Ruby와 Jekyll은 필요하지 않습니다. 그 밖의 브랜치와 PR은 검증만 수행합니다.

`public/CNAME`의 도메인과 기존 `fredko.kr/api/*` Worker 라우트를 유지합니다. 전환 기록과 검증 결과는 [이전 검증 기록](docs/migration/VALIDATION.md)를 참고하세요.

## 라이선스

프로젝트 코드는 [MIT License](LICENSE)를 따릅니다. D2Coding 웹폰트는 [`public/fonts/D2Coding-LICENSE.txt`](public/fonts/D2Coding-LICENSE.txt)의 SIL Open Font License 1.1을 따릅니다.
