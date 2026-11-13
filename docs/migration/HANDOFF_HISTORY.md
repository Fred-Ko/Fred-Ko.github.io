> 이 문서는 과거 단계별 작업 기록입니다. 현재 상태·명령·경로는 [작업 인계](../../HANDOFF.md)를 기준으로 합니다. 기록에 있는 이전 예정·완료·경로 표기는 당시 상태입니다.

# 핸드오프: Jekyll → Astro 전면 이전

작성일 2026-11-12. 다음 작업자(사람 또는 에이전트)가 이 문서만 읽고 이어서 작업할 수 있게 정리했다.

**현재 상태: 구현 단계 1~9 완료.** 원고 28개와 전체 라우트·동적 UI·메타데이터·피드·사이트맵·검색·서비스워커 및 Astro 배포 설정을 연결했다. 로컬 완성본을 확인한 뒤 운영에 전환하면 된다. 최종 상태는 `docs/migration/COMPLETION.md`, 요청 없는 변경의 복원 내역과 유지 근거는 `docs/migration/CHANGE_AUDIT.md`를 참고한다. 아래 단계별 기록은 역사이며 최종 기준과 충돌하면 검토 문서가 우선한다.

## 1. 목표

- **fredko.kr 블로그를 Jekyll에서 Astro로 완전히 교체한다.** Jekyll은 제거한다. 병행 운영하지 않는다.
- 글은 MDX 기반으로 쓰되, 기존 `.md` 글도 그대로 렌더링한다.
- 그 첫 단계로 디자인 시스템을 먼저 만들었다(완료). 다음은 콘텐츠와 페이지 이전이다.
- 기존 URL, 조회수·좋아요 API, RSS, 사이트맵은 깨지면 안 된다.

### 지금까지 내린 결정

| 주제 | 결정 | 이유 |
| --- | --- | --- |
| 프레임워크 | Astro (Docusaurus 아님) | 블로그 중심, 기본 JS 0, MDX와 콘텐츠 컬렉션 지원. Docusaurus는 문서 사이트용이라 블로그에는 과함 |
| 디자인 방향 | 기존 Jekyll 에디토리얼 테마 계승. 다크는 잉크 위 라임, 라이트는 종이 위 검정, 직각, 1px 라인 | 사용자 기존 정체성 유지 |
| Generative UI | A2UI식 "승인된 컴포넌트 카탈로그"만 빌드 타임에 도입. 런타임 생성형 UI(글에 질문하기 등)는 **보류** | LLM API 비용·키, 독자 JS 증가. 하려면 클릭 시 로드하는 island로 실험 (사용자 승인 필요) |

## 2. 작업 위치

| 항목 | 값 |
| --- | --- |
| 원본 저장소(Jekyll, master) | `/Users/junhoko/Documents/Fredko/Fred-Ko.github.io` (`4f659e5`) |
| 워크트리 | `/Users/junhoko/Documents/Fredko/Fred-Ko.github.io-astro` |
| 브랜치 | `feat/astro-design-system` |
| 커밋 | `054e106` 디자인 시스템 v0.1, `1886ed9` v0.2 |
| Astro 프로젝트 | 워크트리 루트 (`astro/` 하위 폴더는 제거됨) |

```bash
cd /Users/junhoko/Documents/Fredko/Fred-Ko.github.io-astro
mise exec -- npm ci
npm run dev     # http://127.0.0.1:4321/design-system/
npm run build   # astro build + pagefind 인덱스
npm test        # 카탈로그 일치 검사 + WCAG 색 대비 검사
```

디자인 시스템 상세는 `DESIGN_SYSTEM.md`에 있다. 이 문서는 그 내용을 반복하지 않는다.

## 3. 완료한 것 (디자인 시스템 v0.2)

- **토큰**: OKLCH 원시 팔레트 + `light-dark()` 시맨틱 토큰. 테마는 시스템/라이트/다크 3단(`html[data-theme]`, `localStorage.theme`).
- **CSS 구조**: `@layer reset, tokens, base, prose, components, utilities`. 컨테이너 쿼리, `@view-transition`, scroll-driven 진행 바, Popover 확대.
- **서체**: Pretendard Variable(본문, 동적 서브셋), Space Grotesk(제목·라벨), D2Coding(코드). 모두 셀프호스팅.
- **가독성·접근성**: 모든 텍스트 WCAG AA 이상. 다크 본문 14.10 / 메타 5.37, 라이트 본문 11.85 / 메타 5.06. 최소 12px, 본문 폭 42rem, 한국어 어절 단위 줄바꿈.
- **코드 블록**: Shiki 듀얼 테마(`github-light-default` / `vitesse-dark`), 파일명 헤더(`title="..."`), 복사, 28줄 초과 자동 접기, highlight/diff/focus/메타 줄 강조.
- **Markdown 플러그인** (`src/lib/markdown.mjs`): 제목 앵커, 표 래퍼, Obsidian/GitHub 콜아웃, `catalogGuard`, Shiki `codeFrame`.
- **컴포넌트**: UI 17개(`src/components/ui/`), 본문용 8개(`src/components/content/`: Callout, Steps, Tabs/Tab, Disclosure, LinkCard, Figure, Badge).
- **카탈로그**: `src/catalog/catalog.mjs` → `/catalog.json`(JSON Schema). MDX가 카탈로그 밖 컴포넌트나 잘못된 props를 쓰면 빌드 실패.
- **기타**: Pagefind 검색(⌘K), OG 이미지 자동 생성(`/og/[slug].png`, satori + resvg), 인쇄 스타일, 검사 스크립트 2종.
- **페이지**: `/design-system/`(쇼케이스), `/catalog.json`, 임시 `index.astro`, 시연용 `src/content/design/prose-sample.mdx`.

### 검증 상태

- 확인함: 검색, 코드 접기·복사, 탭, 테마 3단, 390px 가로 넘침 없음, 카탈로그 위반 시 빌드 실패, 메타 줄 강조, OG 이미지 크기.
- **미확인**: 페이지 간 View Transition(두 번째 페이지 없음), Safari·Firefox, 실제 조회수·좋아요 API 연동.

## 4. 반드시 알아야 할 기술 함정

- **Astro 7의 Markdown 처리기는 Sätteri다.** `markdown.remarkPlugins`/`rehypePlugins`를 넣으면 빌드가 실패한다. 플러그인은 `@astrojs/markdown-satteri`의 `satteri({ mdastPlugins, hastPlugins })`에 넣고, `defineHastPlugin`/`defineMdastPlugin`으로 작성한다. 노드 조작은 `ctx.wrapNode`, `appendChild`, `replaceNode`, `setProperty`를 쓴다. 타입 정의(`node_modules/satteri`)가 가장 정확한 문서다.
- satori는 content-box다. 루트에 padding을 주면 폭에서 빼야 1200×630에 맞는다(`src/lib/og.ts` 주석 참고).
- 각주 제목은 `footnote-label` slug로 나온다. `Toc`에서 제외하고 있으니 slug 규칙을 바꾸면 같이 고친다.
- 컴포넌트를 추가하거나 Props를 바꾸면 `catalog.mjs`도 고쳐야 한다(`npm run check:catalog`가 잡는다).
- headless Chrome의 `--dump-dom`은 스크립트 실행 후 상태를 제대로 못 본다. 상호작용 검증은 CDP 스크립트나 Playwright로 한다.

## 5. 다음 단계: 콘텐츠·페이지 이전

### 5-1. 기존 사이트 사실 (원본 저장소에서 확인함)

- **원고 위치**: `블로그/<카테고리>/_posts/*.md`, 활성 글 **28개**. `_removed_posts/`의 3개는 삭제된 글이라 이전하지 않는다.
- **프론트매터**: `post_id`(UUID), `title`, `description`, `datetime`(ISO), `tags`, `nanoId`, `permalink: /<nanoId>/`.
- **실제 배포 URL은 루트 nanoId다.** `_site/jUbARn1TyHjM47AzUKWO4EZeQ/`처럼 생성된다. `_config.yml` 기본값 `/posts/:permalink/`는 프론트매터 `permalink`에 덮어써져 쓰이지 않는다.
- **그 밖의 경로**: `/page2/`(홈 페이지네이션), `/tags/:name/`, `/categories/:name/`, `/archives/`, `/about/`, `/404.html`, `/feed.xml`, `/sitemap.xml`, `/robots.txt`, `/sw.min.js`(PWA), `CNAME`.
- **카테고리**: 폴더명(`블로그/<카테고리>/`)에서 온다. 정확한 매핑은 `_site/categories/`와 대조해서 확인할 것.
- **Jekyll 플러그인** (`_plugins/`): `posts-lastmod-hook.rb`(git 기준 수정일), `validate-post-id.rb`(post_id 검증), `shiki-highlighter.rb`.
- **동적 기능**: Cloudflare Worker `cloudflare/blog-api`, `api_base: /api`. `PostStats`가 이미 이 API 형식에 맞춰져 있다.
- **설정**: 기존 `_config.yml`은 제거했고 GA·PWA·API·소셜 설정은 `docs/migration/legacy-settings.json`에 보존했다. 후속 단계에서 Astro에 연결해야 한다. 소개 페이지 원고는 `docs/migration/about.md`에 있다.
- **배포**: `.github/workflows/pages-deploy.yml`(교체 대상), `lint-js.yml`, `lint-scss.yml`(정리 대상).

### 5-2. 원고 문법 조사 결과: 지원해야 하는데 아직 안 되는 것

| 항목 | 현황 | 처리 방안 |
| --- | --- | --- |
| kramdown 속성 `{:width="820px"}` | 4곳 | Sätteri가 지원하지 않는다. 이전 스크립트로 원고에서 제거하고 Figure나 이미지 속성으로 변환 |
| 이미지 `![](assets/img/...)` | 11개 파일, **alt가 전부 비어 있음** | 경로 재작성, alt 채우기(접근성). `assets/img` 28개, 13MB(png 16, webp 9) → `astro:assets`로 최적화 권장 |
| 인라인 수식 `\( T_1, \dots \)` | 1곳(saga 글) | 수식 렌더러를 붙이기엔 과하다. 유니코드(T₁, …, Tₙ)로 바꾸는 것을 권장 |
| `> [!CAUTION]` | 1곳 | 이미 `warning`으로 매핑됨. 동작 확인만 하면 된다 |
| 표 안 `<br>` | 23곳 | Sätteri의 raw HTML 처리 확인 필요 |
| 코드 언어 | bash 31, graphql 14, json 8, typescript 6, text 6 등 | 모두 Shiki 기본 지원 |
| Mermaid | 없음 | 지원 불필요 |

### 5-3. 작업 순서 (제안)

1. **완료:** `astro/`를 저장소 루트로 옮기고 Jekyll 파일(`_layouts`, `_includes`, `_sass`, `_plugins`, `Gemfile*`, `*.gemspec`, 루트의 디버그용 js·md 등)을 제거한다.
2. **완료:** 콘텐츠 컬렉션 `posts`를 정의한다. zod 스키마로 `post_id`(UUID), `datetime`, `nanoId`를 검증하고 중복 `post_id`·`nanoId`가 있으면 빌드를 실패시킨다(`validate-post-id.rb` 대체).
3. **완료:** 이전 스크립트로 원고 28개를 복사하면서 5-2 항목(kramdown 속성, 이미지 경로, 수식)을 변환한다. 원본은 건드리지 않는다.
4. **완료:** 라우트를 재현한다: `/[nanoId]/`, `/`·`/page/N/`(기존 `/page2/` 호환 필요), `/tags/[name]/`, `/categories/[name]/`, `/archives/`, `/about/`, 404.
5. **완료:** 읽기 시간, git 기반 lastmod(`posts-lastmod-hook.rb` 대체)를 넣는다.
6. **완료:** RSS(`/feed.xml` 경로 유지), 사이트맵, robots, PWA 서비스워커, GA, CNAME을 복원한다.
7. **완료:** 포스트별 OG 이미지를 `og/[slug].png.ts`에 연결한다.
8. **완료:** GitHub Actions 배포를 Astro 빌드로 바꾼다.
9. **완료:** 검증: 기존 `_site`의 URL 목록과 새 `dist`의 URL 목록을 diff해서 빠진 경로가 없는지 확인한다. 이 시점에 View Transition, Safari·Firefox(Playwright webkit/firefox), API 연동을 함께 확인한다.

### 5-4. 그 밖의 개선 후보 (우선순위 낮음)

- UI 라벨이 영어(`Contents`, `Older`/`Newer`, `Copy`/`Copied`)다. 에디토리얼 스타일로 의도한 것인지 사용자에게 확인하지 않았다.
- `og.ts`의 색이 하드코딩돼 있다. `tokens.css`에서 읽어 오면 토큰과 어긋날 일이 없다(`check-contrast.mjs`의 OKLCH 파서 재사용 가능).
- `og.ts`의 제목 크기를 글자 수로만 정한다. 긴 한국어 제목은 넘칠 수 있으니 줄 수 제한이 필요하다.
- 폰트 대체 메트릭(`size-adjust`, `ascent-override`)이 없어 폰트 교체 시 레이아웃이 밀릴 수 있다.
- `Figure`는 일반 `<img>`다. `astro:assets`로 바꾸면 반응형 크기와 AVIF/WebP를 얻는다.
- Playwright + axe로 접근성·시각 회귀 테스트를 `npm test`에 추가한다.

## 6. 사용자 선호 (반드시 지킬 것)

- **모든 응답과 문서는 한국어로 쓴다.** 영어로 답했다가 두 번 지적받았다.
- 원본 저장소의 `AGENTS.md`가 있으면 읽고 따른다. 요청 없이 수정하지 않는다.
- 큰 단계(루트 이동, Jekyll 삭제, 배포 교체)는 시작 전에 사용자 확인을 받는다. 사용자가 다음 진행을 지시하여 1단계를 완료했다. 후속 단계는 별도로 진행하며, 운영 배포는 아직 요청받지 않았다.


## 7. 루트 이동 완료 기록

- Astro의 `src/`, `public/`, `scripts/`, `astro.config.mjs`, `tsconfig.json`, 패키지·잠금 파일을 루트로 옮겼다.
- Jekyll 디렉터리, Ruby 의존성, Rollup·PurgeCSS·SCSS 설정, 디버그 파일, 이전 lint 워크플로를 제거했다.
- `mise`, 개발 컨테이너, VS Code 작업과 실행 문서를 Astro 기준으로 바꿨다. API는 별도 TypeScript 프로젝트이므로 루트 `tsconfig.json`에서 `cloudflare/`를 제외했다.
- `블로그/`, `_removed_posts/`, `cloudflare/`는 그대로 보존했다. 기존 `assets/img/`의 이미지는 `public/assets/img/`에 바이트 그대로 옮겼다. `public/favicons/`의 초록색 곰도 유지한다.
- 두 위치의 `site.webmanifest`에서 Liquid 템플릿을 제거하고 유효한 정적 JSON으로 변환했다. 기존 이미지 경로용 매니페스트와 새 파비콘 경로용 매니페스트가 각각 자기 아이콘을 가리킨다.
- CNAME과 `.nojekyll`은 `public/`로 옮겼다.
- 기존 경로를 사용하던 개발·미리보기 서버를 종료하고 새 루트에서 다시 실행했다. 개발 서버는 `http://127.0.0.1:4321/`, 빌드 미리보기는 `http://127.0.0.1:4399/`다. 두 서버에서 홈·디자인 시스템·카탈로그·기존 아이콘 URL의 HTTP 200을 확인했다.
- **검증:** 루트에서 의존성 새 설치, 카탈로그 8개 검사, 색 대비 검사, Astro 정적 빌드와 Pagefind 인덱스 생성 성공. 소스·원고·API·이미지 보존 및 빌드 산출물 경로도 비교했다.
- 브라우저 상호작용 재검증과 실제 API 연동은 이번 단계에서 수행하지 않았다. 2페이지(홈 자리표시자와 디자인 시스템)만 빌드되는 상태이며, 실제 원고 페이지는 아직 없다.
- `.github/workflows/pages-deploy.yml`은 8단계에서 교체할 기존 Jekyll 워크플로다. 현재 브랜치를 운영에 병합하면 안 된다.


## 8. 콘텐츠 컬렉션 완료 기록

- `src/content.config.ts`가 `src/content/posts/`의 MD·MDX를 읽는다. 아직 실제 원고는 복사하지 않아 컬렉션은 비어 있다.
- `src/lib/posts/schema.ts`에서 UUID, 제목, 시간대 포함 ISO 날짜, URL 안전 nanoId, `/<nanoId>/` 일치를 검증한다.
- `sources.ts`와 `loader.ts`가 비공개 글까지 ID 중복을 검증한 뒤 공개 글만 저장한다. `published: false`, `draft: true`, 미래 날짜의 글과 삭제 글 보관 폴더는 공개 대상이 아니다.
- 개발 중 파일 추가·변경·삭제를 재검증하며, 공개 취소·삭제 후 오래된 컬렉션 항목을 제거한다.
- `npm test`에 글 검증 시험 7개를 추가했다. 기존 원고 28개 검사와 격리된 실제 Astro 빌드 시험을 포함한다. `npm run build`도 통과했다.
- **새 기술 함정:** 제목 기반 파일명에 `?`가 있으면 Astro MDX 지연 렌더링이 실패했다. 3단계에서 원고를 `<nanoId>.md` 파일명으로 복사한다. 기존 URL·post_id는 바꾸지 않는다.
- 세부 규칙은 `docs/migration/CONTENT.md`를 참고한다. 이번 단계에서 콘텐츠 변환과 실제 글 라우트 구현은 수행하지 않았다.


## 9. 원고 이전 완료 기록

- `src/content/posts/`에 원고 28개를 `<nanoId>.md`로 복사했다. 기존 `post_id`, `nanoId`, permalink와 나머지 메타데이터를 유지했다. 카테고리는 기존 배포 결과와 대조하여 `블로그`와 하위 폴더명을 함께 넣었다.
- 이미지 참조는 27곳, 사용한 이미지 원본은 26개다. 모든 이미지 경로를 `/assets/img/...`로 고치고 빈 대체 텍스트 26곳을 채웠다. 이미지 크기 지정 3곳은 HTML 속성으로 보존하고 원본 종횡비를 반영했다.
- kramdown 크기 문법 4곳 중 나머지 1곳은 문법을 설명하는 본문이므로 인라인 코드로 보존했다. Saga 문단의 수식 2개를 유니코드로 변환했다.
- Sätteri의 `rawHtml: true`를 설정하여 이미지와 표의 `<br>`가 Markdown 모듈에서도 유지되도록 했다. 표 줄바꿈 23곳과 경고 콜아웃을 렌더링 결과에서 확인했다.
- `npm run migrate:posts`는 재현 가능한 이전 명령이다. 기존 대상 파일이 다르면 덮어쓰지 않는다. `npm run check:migration`은 원고·이전 기록을 대조한다. `docs/migration/posts-manifest.json`에 원본·대상 경로, 해시와 변환 건수를 남겼다.
- `npm run test:migration` 검사 3개를 추가했다. 28개 원고의 코드 블록·인라인 코드를 순서대로 대조하고, 격리한 Astro 프로젝트에서 실제 글 28개를 모두 렌더링했다. 이때 만든 글 라우트는 시험용이며 실제 프로젝트에는 남기지 않았다.
- 원본 `블로그/`, `_removed_posts/`, API는 변경하지 않았다. 프로젝트 빌드는 공개 글 28개를 읽지만 아직 글 상세 라우트가 없으므로 페이지 출력은 2개다. 다음 단계는 실제 글 상세·목록·태그·카테고리·보관함·소개·404 라우트다.
- 기술 메모: macOS 임시 디렉터리의 `/var`·`/private/var` 경로 별칭 때문에 scoped CSS의 Astro 캐시 키가 어긋났다. 전체 렌더링 시험은 `realpath()`로 정규화한 임시 루트를 사용한다.
- 이전 기간의 원본 대조 검사는 의도적인 Astro 원고 수정도 차이로 감지한다. 운영 전환 후 원고 작성 위치를 Astro로 확정할 때 일회성 이전 기준 검사도 함께 정리한다.


## 10. 최종 구현 상태

사용자가 "끝까지 다하고 그다음 확인"을 지시했으므로 남은 단계별 재승인 없이 전체 구현·검증을 수행했다. 역사적 작업 기록의 "후속 단계" 표기는 당시 상황이며 현재는 완료했다.

- 실제 글 28개, 홈 20개씩 페이지네이션, `/page/2/`와 기존 `/page2/`, 태그·카테고리·보관함·소개·404를 구현했다.
- 읽기 시간과 Git 기반 수정일, 글별 OG 이미지·JSON-LD·canonical·RSS·사이트맵·robots·GA를 연결했다. 경로를 옮기는 최초 커밋은 내용 수정일로 세지 않는다.
- 조회수·익명 좋아요·GitHub 세션·댓글 작성·수정·답글·삭제·로그아웃 UI를 연결했다. 기존 Worker 코드는 수정하지 않았다.
- 초록색 곰 아이콘과 CNAME을 유지했다. 서비스워커는 기존 경로에서 이전 테마 캐시를 정리하며 오프라인 캐시는 생성하지 않는다.
- 실제 글만 Pagefind에 포함한다. 디자인 시스템의 예시가 검색 결과에 섞이지 않는다.
- 배포 워크플로에서 Ruby/Jekyll을 제거하고 Astro 타입·단위·빌드·내부 링크 검증 후 `dist/`를 GitHub Pages에 배포하도록 교체했다.
- `npm run preview`는 완성한 `dist/`와 로컬 Worker(8788)를 함께 제공한다. 기존 시험용 임시 미리보기 대신 이 서버를 4400에서 사용한다.
- 검증 범위와 실제 GitHub 계정 승인에 대한 구분은 완료 보고서를 참고한다.


## 11. 로컬 검토 반영

사용자는 운영 배포가 아닌 로컬 미리보기 실행을 요청했다. 원격 푸시·운영 배포는 실행하지 않았으며, 이후 수정도 로컬에만 반영한다.

- 모바일 목차 기본 접기, 수정일·태그 정보 접기와 두 줄 설명으로 본문 접근 거리를 줄였다.
- 홈의 여백·목록 제목 크기와 연재 제목의 반복을 줄였다. AI Native 연재명·회차는 라벨, 주제는 제목으로 표시한다. 원래 문서 제목·URL·ID는 보존한다.
- 라이트 강조색 `#166534`, 호버 배경 `#F0FDF4`를 적용했다. 다크 라임을 유지하고 보조정보 명도를 높였다.
- 댓글 작성 패널과 로그인 버튼을 정리하고, 검색 결과 미리보기는 두 줄로 제한했다.
- 정렬 문제는 Jekyll의 파일명 발행일을 `datetime` 정렬로 바꾼 데서 발생했다. `publishedAt()`으로 이전 발행일과 기존 순서를 복원했다. 원고의 `datetime` 자체는 변경하지 않았다.


## 12. 제목과 홈 소개 영역 수정 취소

사용자는 목록 제목을 원문 전체로 길게 표시하고 홈 소개 문구를 삭제하도록 정정했다. 제목 변환 함수는 제거했으며 연재명을 떼거나 1부 제목을 새로 만들지 않는다. 홈의 큰 소개 제목·설명 영역은 삭제하고 최근 글 목록부터 보여 준다. 11절의 제목 분리 기록은 현재 적용되지 않는다. 다른 디자인을 추가로 바꾸지 않는다.


## 13. 이전 작업의 콘텐츠 기준

사용자는 기존 fredko.kr을 Astro로 변환하는 것이므로 원본의 내용·제목·순서·구성을 기본값으로 유지하라고 지적했다. 임의의 홈 소개 문구, 새로 붙인 1부 제목, 중복 소개 제목과 장식성 안내 문구를 제거했다. 제목은 목록·본문·검색 모두 원문 전체를 표시한다. 요청한 개선은 별도로 적용하되, 이전 작업을 새 카피 작성이나 새로운 정보 구성의 권한으로 확대하지 않는다.

## 14. 요청 범위 전체 검토

사용자가 요청하지 않은 변경 전체를 검토하고 제거하도록 지시했다. 원본의 실제 템플릿·CSS·산출물과 대조하여 공통 영문 문구, 전체 글 제목, 제목 디자인, 발행일·순서·읽기 시간·수정일, 카테고리 계층·보관함, 작성자·라이선스·공유·이미지 확대·맨 위 이동, 숫자·댓글 프로필·날짜, RSS 5개, PWA 설정을 복원했다. 자동 연재·이전/다음·진행 바·실제 글 코드 자동 접기·새 답글 작성 버튼은 제거했다. 최근 업데이트·인기 태그는 원본도 숨김이므로 노출하지 않는다.

명시적으로 요청받은 모바일 목차 접기·정보 압축·홈 밀도·딥그린 테마·보조정보 명도·검색 두 줄·댓글 스타일은 유지하고 측정 결과와 근거를 `docs/migration/CHANGE_AUDIT.md`에 기록했다. 원본 28개 글 메타데이터와 공통 기능을 검증하는 `npm run check:baseline`을 추가했다. 로컬 확인 주소는 `http://127.0.0.1:4400/`이며 원격 푸시·병합·배포는 하지 않았다.
