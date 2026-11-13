# 글과 이미지 관리

## 현재 입력 위치

Astro는 `src/content/posts/`의 `.md`·`.mdx`를 읽는다. 파일명은 `<nanoId>.md` 또는 `<nanoId>.mdx`를 권장하며 공개 주소는 `/<nanoId>/`다. 소개 원고는 `src/content/pages/about.md`다.

기존 Obsidian/Jekyll 발행 도구는 `블로그/**/_posts/*.md`에 계속 내보낼 수 있다. `npm run build`, `dev`, `check:types` 전에 `prepare:content`가 실행돼 추가·수정·삭제를 Astro 원고에 반영한다. 파일명 발행일·폴더 카테고리·UUID·nanoId·공개 주소를 유지한다. `_removed_posts/`는 공개 입력이 아니다. 같은 글을 두 위치에서 동시에 수정하면 자동 덮어쓰기 대신 충돌을 알린다.

## 원고 정보

| 필드 | 규칙 |
| --- | --- |
| `post_id` | UUID. 기존 API 식별자이므로 유지한다. 대소문자는 소문자로 정규화한다 |
| `nanoId` | 영문·숫자·밑줄·하이픈으로 된 URL 식별자. 대소문자 유지 |
| `permalink` | 반드시 `/<nanoId>/`와 일치 |
| `title` | 비어 있지 않은 원문 제목 |
| `datetime` | 시간대가 포함된 ISO 날짜. 신규 글의 발행일 |
| `description` | 글 설명. 생략 가능 |
| `tags`, `categories` | 문자열 배열. 생략하면 빈 배열 |
| `published` | 기본 `true`. `false`이면 비공개 |
| `draft` | 기본 `false`. `true`이면 초안 |

기존 글의 발행일·같은 날짜의 순서·원문이 같은 경우의 읽기 시간은 `src/data/legacy-posts.json`으로 보존한다. 이 파일은 과거 호환을 위한 운영 데이터이며 새 글마다 항목을 추가할 필요는 없다. 본문이 달라지면 읽기 시간은 기존 계산 규칙으로 다시 계산한다.

## 공개와 검증

빌드 시점에 `published: true`, `draft: false`, 발행 시각 이전인 글만 공개한다. 예약 시각이 지난 뒤에는 새 빌드·배포가 필요하며, 정기 자동 배포는 설정하지 않았다.

숨김·밑줄로 시작하는 폴더와 파일, 심볼릭 링크는 제외한다. 비공개 원고까지 UUID·nanoId 중복을 검사한다. 개발 중 추가·수정·삭제·공개 취소 시 컬렉션을 다시 구성한다.

일반 검사는 현재 원고를 기준으로 하며 이전 당시 28개나 본문 해시를 강제하지 않는다.

```bash
npm run check:types
npm test
npm run build
npm run check:site
```

## 이미지

기존 발행 이미지 저장 위치는 `assets/img/`다. 빌드 전에 `public/assets/img/`로 자동 복사하며 공개 주소는 `/assets/img/...`다. 생성된 `public/assets/img/`는 커밋하지 않는다.

```md
![이미지 설명](/assets/img/example.png)
```

기존 `/assets/img/...` URL과 발행 도구의 `assets/img/` 저장 위치를 모두 유지한다. 이미지·기존 형식 원고의 변환은 코드 예시를 건드리지 않는다.

이미지 대체 텍스트를 작성하고, HTML 이미지는 width·height를 원래 비율에 맞춰 지정한다. 이미지 누락은 일반 사이트 검사에서 발견한다. 기존 이미지 크기·수식·표 줄바꿈 변환 내역은 [이전 검증 기록](migration/VALIDATION.md)에 있다.

## 일회성 이전 자료

- `scripts/migration/`: 원고 변환·기록 대조·원래 화면 검사 도구.
- `tests/migration/`: 기존 원문·코드·변환 결과를 엄격하게 대조하는 시험.
- `docs/migration/`: 원본 URL·순서·원문 해시 등의 스냅샷과 검토 기록.

`npm run test:migration`, `npm run check:migration`, `npm run check:baseline`은 이전 결과를 재검토할 때 명시적으로 실행한다. 원고를 의도적으로 수정한 뒤 차이가 나더라도 이를 일반 발행 실패로 취급하지 않는다. `migrate:posts`는 다른 내용의 파일을 덮어쓰지 않고 중단한다.
