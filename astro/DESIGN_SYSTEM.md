# Fredko 디자인 시스템 v0.2

Jekyll 블로그의 에디토리얼 테마를 Astro로 옮기면서 토큰, 컴포넌트, 빌드 규칙으로 정리했다. 쇼케이스는 `/design-system/`, 컴포넌트 카탈로그는 `/catalog.json`이다.

```bash
cd astro
npm install
npm run dev      # http://127.0.0.1:4321/design-system/
npm run build    # astro build + pagefind 검색 인덱스
npm test         # 카탈로그 일치 검사 + 색 대비 검사
```

## 원칙

- **다크는 잉크 위의 라임, 라이트는 종이 위의 검정.** 라이트에는 컬러 포인트가 없고, 호버하면 검정으로 반전된다.
- **직각과 1px 그리드 라인.** 모든 radius는 0이다. 토글 스위치만 `--radius-pill`을 쓰는 예외이고, 그림자는 쓰지 않는다.
- **읽기 우선.** 모든 텍스트는 WCAG AA(4.5:1) 이상이다. 최소 글자 크기는 12px, 본문 폭은 42rem, 한국어는 어절 단위로 줄바꿈한다.
- **JS 없이 먼저 동작.** 진행 바, 이미지 확대, 접기, 페이지 전환은 CSS나 네이티브 HTML로 만든다. JS는 복사, 탭, 검색처럼 꼭 필요한 곳에만 쓰고, JS가 없어도 내용은 모두 보인다.

## 토큰 (`src/styles/tokens.css`)

| 계층 | 예 | 규칙 |
| --- | --- | --- |
| Primitive | `--ink-950`, `--lime-400`, `--paper-50` | OKLCH 원시 팔레트. **컴포넌트에서 직접 참조하지 않는다.** |
| Semantic | `--bg`, `--fg-strong`, `--line`, `--accent`, `--hover-bg` | `light-dark(라이트, 다크)` 한 줄로 두 테마를 정의한다. |
| Scale | `--text-*`, `--space-*`, `--tracking-*`, `--leading-*` | 테마와 무관하다. 제목과 본문 크기는 `clamp()`로 유동 조정한다. |

**테마 결정.** 기본은 `color-scheme: light dark`, 즉 OS 설정을 따른다. 사용자가 고르면 `html[data-theme="light"|"dark"]`로 고정하고 `localStorage.theme`에 저장한다. `light-dark()`가 요소의 color-scheme을 따르므로, 컴포넌트에는 테마별 셀렉터 분기가 하나도 없다. 테마별로 동작이 달라야 하는 인터랙션은 `--hover-bg`, `--hover-fg`, `--hover-border` 토큰으로 처리한다.

**서체.**

| 용도 | 서체 | 비고 |
| --- | --- | --- |
| 제목, 라벨 | Space Grotesk | |
| 본문 | Pretendard Variable | 동적 서브셋이라 필요한 글자만 내려받는다 |
| 코드 | D2Coding | |

모두 셀프호스팅한다.

## CSS 구조 (`src/styles/`)

```text
@layer reset, tokens, base, prose, components, utilities;
```

- `global.css`: 레이어 선언, 폰트, reset·base·utilities, 인쇄 스타일, `@view-transition`
- `tokens.css`: 토큰
- `prose.css`: 본문(.prose)
- `components.css`: Markdown 플러그인과 컴포넌트가 같이 쓰는 마크업(`.callout`, `.steps`)

Astro 컴포넌트의 scoped style은 레이어 밖에 있어서 항상 위 레이어보다 우선한다. 그래서 `!important`가 필요 없다.

## 컴포넌트

### 레이아웃·UI (`src/components/ui/`)

| 컴포넌트 | 용도 |
| --- | --- |
| `SiteHeader` | 상단 바(브랜드, 탭, 검색 ⌘K, 테마) |
| `ThemeToggle` | 시스템/라이트/다크 3단(radiogroup, 화살표 키 지원) |
| `SearchDialog` | Pagefind 전문 검색(⌘K, Ctrl+K, `/`). 인덱스는 처음 열 때 불러온다 |
| `ReadingProgress` | 읽기 진행 바(CSS scroll-driven animation) |
| `SectionHeading`, `Kicker`, `Button`, `Tag` | 공통 UI |
| `WritingList`, `WritingRow` | 글 목록. 컨테이너 쿼리로 반응한다. `transitionName`으로 포스트 제목과 이어진다 |
| `PostHero`, `Toc`, `PostNav`, `Pagination` | 포스트 상단, 목차, 이전/다음, 페이지 번호 |
| `SeriesNav` | 연재 목차와 이전/다음 편 |
| `PostStats` | 조회수, 댓글, 좋아요(기존 Worker API `/api/posts/:id/*`) |
| `ProseEnhancer` | 코드 복사 버튼, 긴 코드 접기 |

### 본문(MDX) 컴포넌트 (`src/components/content/`), 카탈로그 관리 대상

| 컴포넌트 | 용도 |
| --- | --- |
| `Callout` | note, tip, warning, danger 박스 |
| `Steps` | 번호 목록을 단계 표시로 |
| `Tabs`, `Tab` | 언어별 코드 등. `syncKey`로 그룹 간 선택을 공유한다 |
| `Disclosure` | `<details>` 접기 |
| `LinkCard` | 카드형 링크 |
| `Figure` | 캡션 이미지. Popover API로 확대한다 |
| `Badge` | 인라인 상태 표시 |

## 컴포넌트 카탈로그 (`src/catalog/catalog.mjs`)

Google A2UI의 카탈로그 개념을 빌드 타임에 적용했다. **MDX에서는 카탈로그에 있는 컴포넌트만 쓸 수 있다.**

- 각 컴포넌트의 props를 JSON Schema로 기술하고 `/catalog.json`으로 배포한다. AI 글쓰기 도구에 그대로 넘겨 "이 컴포넌트만 써라"라고 제한할 수 있다.
- 빌드 중 `catalogGuard`(mdast 플러그인)가 다음을 검사하고, 위반하면 **빌드를 실패**시킨다.
  - 카탈로그에 없는 컴포넌트
  - 필수 속성 누락
  - 정의되지 않은 속성
- `npm run check:catalog`는 카탈로그와 실제 `.astro` Props가 어긋나지 않았는지 검사한다.

컴포넌트를 추가하거나 Props를 바꾸면 카탈로그도 같이 고친다.

## Markdown 작성 규칙

| 문법 | 결과 |
| --- | --- |
| ` ```kotlin title="Order.kt" ` | 파일명 헤더, 언어 표시, 복사 버튼이 붙은 코드 블록 |
| `// [!code highlight]`, `[!code ++]`, `[!code --]`, `[!code focus]` | 줄 강조, 추가, 삭제, 포커스 |
| ` ```ts {1,3-4} ` | 메타로 줄 강조 |
| 28줄 초과 코드 | 자동으로 접힘(JS가 있을 때만) |
| `> [!tip] 제목` | 콜아웃. Obsidian/GitHub 문법이라 `.md`에서도 동작한다 |
| 표 | 래퍼가 가로 스크롤을 담당하고, `:---:` 정렬을 지원한다 |
| `- [ ]`, `- [x]` | 체크리스트 |
| 각주 `[^1]` | 하단 "각주" 영역(목차에서는 제외) |

h2~h4에는 `#` 앵커가 자동으로 붙는다. 코드 테마는 `github-light-default`와 `vitesse-dark`이고, 둘 다 본문과 주석 대비가 AA 이상이다.

## 빌드 산출물

| 항목 | 내용 |
| --- | --- |
| OG 이미지 | `/og/[slug].png`, 1200×630. satori와 resvg로 토큰 색과 서체를 그대로 쓴다 |
| 검색 인덱스 | `/pagefind/`. `data-pagefind-body` 영역만 색인하고, 결과 제목은 `PostHero` 제목을 쓴다 |
| 카탈로그 | `/catalog.json` |

## 알려진 제약

- Astro 7의 Markdown 처리기는 Sätteri다. remark/rehype 플러그인은 쓸 수 없고, `src/lib/markdown.mjs`처럼 `defineHastPlugin`/`defineMdastPlugin`으로 작성한다.
- `light-dark()`, `@view-transition`, scroll-driven animation, Popover API, `::details-content`는 최신 브라우저 기능이다. 지원하지 않는 브라우저에서는 전환 효과나 진행 바가 빠질 뿐, 내용과 기능은 유지된다. `light-dark()`는 2024년부터 주요 브라우저가 모두 지원한다.
- 런타임 생성형 UI(AI 답변을 컴포넌트로 렌더링)는 아직 도입하지 않았다. 카탈로그가 그 기반이고, 도입할 때는 클릭할 때만 불러오는 섬(island) 형태로 실험한다.
