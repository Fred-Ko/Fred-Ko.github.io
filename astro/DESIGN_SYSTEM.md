# Fredko 디자인 시스템

Jekyll 블로그의 에디토리얼 테마(`_sass/pages/_editorial.scss`)를 Astro로 옮기면서 토큰과 컴포넌트로 정리한 것이다. 쇼케이스는 `/design-system/`에서 확인한다.

```bash
cd astro
npm install
npm run dev        # http://127.0.0.1:4321/design-system/
npm run build
```

## 원칙

- **다크는 잉크 위의 라임, 라이트는 종이 위의 검정.** 라이트 모드에는 컬러 포인트가 없고, 호버하면 검정으로 반전된다.
- **직각.** 모든 요소의 `border-radius`는 0이다. 토글 스위치만 `--radius-pill`을 쓰는 예외다.
- **1px 그리드 라인.** 구획은 그림자가 아니라 `--line` 테두리로 나눈다. 그림자는 쓰지 않는다.
- **대문자 라벨.** 메타 정보, 인덱스, 패널 제목은 `.label` 클래스(Space Grotesk, 대문자, 넓은 자간)로 쓴다.
- **세 가지 서체.** 제목과 라벨은 Space Grotesk, 본문은 Noto Sans KR, 코드는 D2Coding이다.

## 토큰 (`src/styles/tokens.css`)

| 계층 | 예 | 규칙 |
| --- | --- | --- |
| Primitive | `--ink-950`, `--lime-400`, `--paper-50` | 팔레트 원본. **컴포넌트에서 직접 참조하지 않는다.** |
| Semantic | `--bg`, `--fg-strong`, `--line`, `--accent` | 컴포넌트는 이것만 쓴다. 테마 전환 시 이 계층만 다시 매핑된다. |
| Scale | `--text-*`, `--space-*`, `--tracking-*`, `--leading-*` | 테마와 무관한 고정 값이다. |

시맨틱 색상 역할은 다음과 같다.

- `--bg`, `--bg-raised`, `--bg-hover`: 페이지, 카드, 호버 배경
- `--fg-strong`, `--fg-prose`, `--fg`, `--fg-muted`, `--fg-subtle`: 제목에서 캡션까지 단계별 텍스트
- `--accent`, `--accent-fg`: 포인트 배경과 그 위의 텍스트. 반드시 짝으로 쓴다.
- `--note-*`, `--tip-*`, `--warning-*`, `--danger-*`: 콜아웃 전용

테마는 `<html data-theme="dark|light">`로 결정한다. 기본값은 다크이며, 선택한 테마는 `localStorage.theme`에 저장된다.

## 컴포넌트 (`src/components/ui/`)

| 컴포넌트 | 용도 |
| --- | --- |
| `SiteHeader` | 상단 고정 바(브랜드, 탭, 테마 토글) |
| `ThemeToggle` | 다크/라이트 스위치 |
| `SectionHeading` | 대형 섹션 제목과 오른쪽 보조 라벨 |
| `Kicker` | 제목 위의 `A / B` 형태 라벨 |
| `Button` | `solid`(페이지당 1개 이하), `outline`, `ghost`(화살표 링크) |
| `Tag` | 직각 태그. `href`가 있으면 링크, `count`를 넘기면 개수 표시 |
| `WritingList`, `WritingRow` | 글 목록. 호버하면 행 전체가 포인트 컬러로 반전된다 |
| `PostHero` | 포스트 상단(Kicker, 제목, 설명, 메타, 태그) |
| `Toc` | 목차. 현재 읽는 섹션에 `aria-current`를 붙여 강조한다 |
| `PostNav` | 이전/다음 글 |
| `Pagination` | 페이지 번호 |
| `Callout` | MDX 본문용 `note`, `tip`, `warning`, `danger` 박스 |

## 본문 (`src/styles/prose.css`)

마크다운 출력은 `.prose` 컨테이너 안에서만 스타일을 받는다. 클래스가 없는 HTML 요소가 대상이다.

- **코드 블록**: Shiki 듀얼 테마(`material-theme-lighter` / `vitesse-dark`)를 `defaultColor: false`로 출력하고, `[data-theme]`에 따라 CSS 변수를 고른다. 줄 번호는 `astro.config.mjs`의 Shiki transformer가 붙이는 `data-line` 속성으로 표시한다.
- **표**: Sätteri HAST 플러그인이 `<div class="table-wrapper">`로 감싼다. 넓은 표는 래퍼 안에서 가로로 스크롤된다.
- **`text` 코드 블록**: 박스 드로잉 다이어그램이 끊기지 않도록 줄 간격을 좁혔다.

## 참고 사항

- Astro 7의 기본 Markdown 처리기는 Sätteri다. remark/rehype 플러그인은 그대로 쓸 수 없고, `satteri()`의 `mdastPlugins`/`hastPlugins`로 작성해야 한다.
- 폰트는 셀프호스팅한다. Space Grotesk와 Noto Sans KR은 `@fontsource-variable`, D2Coding은 `public/fonts`에서 불러온다. Google Fonts 요청은 없다.
