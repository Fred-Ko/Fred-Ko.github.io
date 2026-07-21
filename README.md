# Fredko Dev Log

[fredko.kr](https://fredko.kr)에 배포되는 Markdown-first 개발 블로그입니다.

게시물은 `블로그/**/_posts/*.md`에서 작성하며 Jekyll이 정적 HTML로 빌드합니다. 조회수, 좋아요, 순 방문자 및 GitHub OAuth 댓글은 Cloudflare Workers와 D1이 담당합니다. 웹 기반 글 작성 기능은 제공하지 않습니다.

## 구성

- Jekyll 기반 정적 사이트 생성
- Shiki 기반 빌드 타임 코드 하이라이팅
- Markdown 표, Mermaid 및 수식 지원
- Cloudflare Workers + D1 기반 동적 기능
- GitHub OAuth 댓글
- GitHub Actions + GitHub Pages 배포

## 로컬 실행

```bash
bundle install
npm ci
bundle exec jekyll serve --config _config.yml,_config.development.yml
```

블로그 API를 함께 실행하려면 별도 터미널에서 다음 명령을 실행합니다.

```bash
cd cloudflare/blog-api
npm ci
npm run dev
```

동적 기능과 배포 설정은 [`docs/DYNAMIC_BLOG.md`](docs/DYNAMIC_BLOG.md)를 참고하세요.

## 라이선스

프로젝트 코드는 [MIT License](LICENSE)를 따릅니다. D2Coding 웹폰트는 [`assets/fonts/D2Coding-LICENSE.txt`](assets/fonts/D2Coding-LICENSE.txt)의 SIL Open Font License 1.1을 따릅니다.
