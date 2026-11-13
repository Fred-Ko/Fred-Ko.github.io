# 작업 인계

2026년 11월 13일 기준. 이 문서가 현재 상태의 기준이며, 이전 단계별 기록은 [이전 작업 기록](docs/migration/HANDOFF_HISTORY.md)에 보존했다.

## 작업 위치와 실행

- 워크트리: `/Users/junhoko/Documents/Fredko/Fred-Ko.github.io-astro`
- 브랜치: `feat/astro-design-system`
- 원본 운영 저장소: `/Users/junhoko/Documents/Fredko/Fred-Ko.github.io`
- 로컬 미리보기: `http://127.0.0.1:4400/`
- 로컬 API: `http://127.0.0.1:8788/`

실행 명령은 [README](README.md), 글 작성 규칙은 [콘텐츠 안내](docs/CONTENT.md)를 따른다.

## 현재 상태

2026년 11월 13일 사용자 승인으로 `feat/astro-design-system`을 `master`에 fast-forward 병합하고 GitHub Pages에 Astro를 배포했다. 운영 주소는 https://fredko.kr/ 이다. 포크 해제는 사용자가 직접 수행했으며 GitHub의 fork:false를 확인했다.

- 첫 배포 커밋은 `b3a313a`, 배포 기록은 https://github.com/Fred-Ko/Fred-Ko.github.io/actions/runs/43400831813 이며 성공했다.
- 기존 URL 117개, 글 28개 API ID·OG 1200×630, 이미지·초록 곰·검색·RSS·사이트맵·댓글 조회·OAuth 시작을 운영에서 확인했다. Worker·D1·OAuth 설정은 변경하지 않았고 배포 전후 통계값은 28개 모두 동일했다.
- 새 글 수에 맞춰 일반 발행 검사를 수행한다. MD·MDX, 비공개·초안·미래 글, 내부 링크·이미지·OG·API 식별자를 검증한다. 28개 고정 원문 대조는 별도 이전 검사다.
- 기존 발행 도구의 `블로그/`·`assets/img/` 입력은 빌드 전 자동 변환·복사한다. 새 글·수정·삭제·충돌 방지와 실제 Astro 출력을 시험했다.
- 원래 URL·제목·본문·순서·읽기 시간을 유지한다. 사용자 요청 없는 새 문구·탐색 기능을 추가하지 않는다.
- 요청한 그린 테마, 모바일 정보 정리, 검색 두 줄, 댓글 스타일, 로고 확대, 페이지 번호·본문 중앙 정렬, 통계 확대·위치, 옅은 본문 경계선, 코드 줄 간격 20px을 적용했다.

## 검증의 한계

로컬 GitHub OAuth 자격 증명은 없어 실계정 로그인 승인을 완료하지 않았다. 운영 OAuth 시작은 302를 확인했으며 로그인 상태 댓글 UI는 가상 세션으로 시험했다. 실제 Safari 앱·iPhone에서 수동 시험한 것은 아니며 WebKit 자동 검증을 수행했다. 기존 발행 경로는 코드·빌드 시험으로 검증했으며 Obsidian 앱에서 직접 발행 버튼을 누르는 수동 시험은 하지 않았다.

## 폴더와 검사 구분

| 위치 | 용도 |
| --- | --- |
| `src/content/posts/` | 현재 Astro 원고 |
| `src/content/pages/about.md` | 소개 페이지 원고 |
| `src/data/legacy-posts.json` | 기존 글 발행일·정렬·읽기 시간·Git 원본 경로 보존 데이터 |
| `assets/img/` | 기존 발행 이미지 입력. 빌드 전 `public/assets/img/`로 복사, 공개 URL은 `/assets/img/...` |
| `블로그/`, `_removed_posts/` | 기존 형식 발행 입력과 삭제 글 보관본. 이동·삭제하지 않음 |
| `scripts/migration/`, `tests/migration/` | 일회성 이전 도구·검사 |
| `docs/migration/` | 이전 기준 자료와 검토·검증 기록 |
| `cloudflare/blog-api/` | 기존 Worker·D1 API. 로컬 DB는 `.wrangler/` 안에 있음 |

일반 검사: `npm run check:types`, `npm test`, `npm run build`, `npm run check:site`.

이전 원문 대조: `npm run test:migration`, `npm run check:baseline`. 이전 후 원고를 의도적으로 수정하면 차이가 나는 것이 정상이며 일반 발행을 막지 않는다.

## 사용자 기준

한국어로 설명하고, 원본을 유지하는 이전 작업을 새 카피·기능·정보 구성의 권한으로 확대하지 않는다. 원격 푸시·배포는 명시적 승인 시에만 진행한다. 이번 master 병합·배포는 승인받았다. 프로젝트 `AGENTS.md`는 사용자의 요청 없이 수정하지 않는다.

상세 자료: [디자인 시스템](DESIGN_SYSTEM.md), [변경 검토](docs/migration/CHANGE_AUDIT.md), [검증 기록](docs/migration/VALIDATION.md), [동적 기능](docs/DYNAMIC_BLOG.md).

## 정리 후 확인

Node 24에서 타입 오류·경고 0개, 일반 시험 8개, 별도 이전 시험 3개가 통과했다. 현재 사이트 118개 HTML의 링크·자산과 글 연결, 기존 URL 117개 및 원래 글 정보를 대조했다. 세 브라우저에서 목록·분류·보관함·소개·글 정보 이동 검사 6개도 통과했다. 새 MDX 글·이미지 추가와 기존 본문 수정은 격리한 임시 프로젝트에서 검증했으며 실제 원고에는 시험 글을 넣지 않았다.

사용자의 추가 요청으로 조회수·좋아요·댓글 통계를 본문 끝, 태그·공유 위 중앙으로 이동하고 아이콘 24px·숫자 18px로 키웠다. 미리보기는 마지막 정상 빌드를 메모리에 보존하며 빌드 완료 신호 뒤에만 갱신한다. 빌드 중 dist 삭제로 글 주소가 일시적으로 404가 되던 문제를 수정했다. `npm run test:preview`가 미완성·실패 중 유지와 완료 후 갱신을 검사하며 일반 시험에도 포함된다.
