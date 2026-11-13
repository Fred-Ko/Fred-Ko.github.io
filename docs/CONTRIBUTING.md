# 기여 안내

이 저장소는 fredko.kr의 Astro 블로그다.

- 현재 글은 `src/content/posts/`, 소개는 `src/content/pages/about.md`, 이미지는 `public/assets/img/`에서 관리한다. [콘텐츠 안내](CONTENT.md)를 참고한다.
- 기존 발행 도구는 `블로그/**/_posts/*.md`와 `assets/img/`를 사용한다. Astro 빌드 전에 자동 반영한다. `_removed_posts/`는 공개하지 않는다.
- 변경 후 `npm run check:types`, `npm test`, `npm run build`, `npm run check:site`로 확인한다.
- `scripts/migration/`·`tests/migration/`는 일회성 이전 도구·검사다. 일반 발행 검사와 분리했다.
- 기존 글 ID·URL·원문을 임의로 바꾸지 않는다. 화면 문구나 기능 변경은 사용자 요청 범위를 따른다.
- 비밀값과 Cloudflare 자격 증명을 커밋하지 않는다. 로컬 DB가 든 `cloudflare/blog-api/.wrangler/`를 캐시처럼 삭제하지 않는다.
- 로컬 미리보기 확인과 원격 푸시·운영 배포를 구분한다. 배포는 명시적인 요청이 있을 때 수행한다.

동적 기능과 로컬 API 실행은 [동적 기능 안내](DYNAMIC_BLOG.md), 현재 작업 상태는 [작업 인계](../HANDOFF.md)를 참고한다.
