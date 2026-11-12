// @ts-check
/**
 * Fredko 컴포넌트 카탈로그 — MDX 본문에서 쓸 수 있는 "승인된" 컴포넌트 목록.
 *
 * Google A2UI의 카탈로그 개념을 따른다: 각 컴포넌트의 props는 JSON Schema로 기술하고,
 * 사람이든 AI든 글을 쓸 때 이 카탈로그 밖의 컴포넌트는 쓸 수 없다.
 *  - 빌드 검증: src/lib/markdown.mjs의 catalogGuard (없는 컴포넌트·필수 속성 누락 시 빌드 실패)
 *  - 기계 판독: /catalog.json 으로 배포 (AI 글쓰기 도구에 그대로 넘길 수 있음)
 *
 * 컴포넌트 Props를 바꾸면 여기도 함께 고친다. (scripts/check-catalog.mjs가 불일치를 잡는다)
 */

const CATALOG_ID = 'https://fredko.kr/catalog.json';

export const catalog = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: CATALOG_ID,
  catalogId: CATALOG_ID,
  version: '0.2.0',
  description:
    'Fredko Dev Log 본문(MDX)용 컴포넌트 카탈로그. 일반 Markdown 문법(제목, 목록, 표, 코드 블록, 인용, `> [!note]` 콜아웃)은 컴포넌트 없이 쓴다.',
  components: {
    Callout: {
      description: '본문 알림 박스. .md 글에서는 `> [!type] 제목` 문법으로 같은 결과를 낸다.',
      import: '@/components/content/Callout.astro',
      children: 'markdown',
      props: {
        type: 'object',
        properties: {
          type: { enum: ['note', 'tip', 'warning', 'danger'], default: 'note' },
          title: { type: 'string', description: '생략하면 type 이름(Note, Tip…)' },
        },
        required: [],
        additionalProperties: false,
      },
      example: '<Callout type="warning" title="주의">보상 트랜잭션은 멱등해야 합니다.</Callout>',
    },
    Steps: {
      description: '순서 있는 절차. 자식으로 일반 Markdown 번호 목록(1. 2. 3.)을 넣는다. 각 항목 첫 줄이 단계 제목.',
      import: '@/components/content/Steps.astro',
      children: 'markdown-ordered-list',
      props: { type: 'object', properties: {}, required: [], additionalProperties: false },
      example: '<Steps>\n\n1. **설치**\n   `npm i`\n2. **실행**\n   `npm run dev`\n\n</Steps>',
    },
    Tabs: {
      description: '같은 내용을 여러 버전(언어, OS 등)으로 보여주는 탭. 자식은 <Tab>만.',
      import: '@/components/content/Tabs.astro',
      children: 'Tab[]',
      props: {
        type: 'object',
        properties: {
          syncKey: { type: 'string', description: '같은 syncKey의 탭 그룹끼리 선택을 공유 (예: "lang")' },
        },
        required: [],
        additionalProperties: false,
      },
      example: '<Tabs syncKey="lang">\n<Tab label="Kotlin">…</Tab>\n<Tab label="Java">…</Tab>\n</Tabs>',
    },
    Tab: {
      description: '<Tabs>의 한 패널.',
      import: '@/components/content/Tab.astro',
      children: 'markdown',
      props: {
        type: 'object',
        properties: { label: { type: 'string' } },
        required: ['label'],
        additionalProperties: false,
      },
      example: '<Tab label="Kotlin">```kotlin\n…\n```</Tab>',
    },
    Disclosure: {
      description: '접고 펼치는 부가 설명(<details>). 핵심이 아닌 긴 로그, 부록 등.',
      import: '@/components/content/Disclosure.astro',
      children: 'markdown',
      props: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          open: { type: 'boolean', default: false },
        },
        required: ['summary'],
        additionalProperties: false,
      },
      example: '<Disclosure summary="전체 로그 보기">…</Disclosure>',
    },
    LinkCard: {
      description: '외부/내부 문서로 가는 카드형 링크.',
      import: '@/components/content/LinkCard.astro',
      children: 'none',
      props: {
        type: 'object',
        properties: {
          href: { type: 'string', format: 'uri-reference' },
          title: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['href', 'title'],
        additionalProperties: false,
      },
      example: '<LinkCard href="https://a2ui.org" title="A2UI Specification" description="Agent-to-UI 프로토콜" />',
    },
    Figure: {
      description: '캡션이 있는 이미지. 클릭하면 확대(Popover API, JS 없음).',
      import: '@/components/content/Figure.astro',
      children: 'none',
      props: {
        type: 'object',
        properties: {
          src: { type: 'string' },
          alt: { type: 'string', description: '필수 — 이미지가 전달하는 정보를 문장으로' },
          caption: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
        },
        required: ['src', 'alt'],
        additionalProperties: false,
      },
      example: '<Figure src="/img/saga.png" alt="Saga 오케스트레이션 흐름도" caption="그림 1. 오케스트레이션" />',
    },
    Badge: {
      description: '인라인 상태 표시(버전, 지원 여부 등).',
      import: '@/components/content/Badge.astro',
      children: 'text',
      props: {
        type: 'object',
        properties: {
          tone: { enum: ['neutral', 'accent', 'warning', 'danger'], default: 'neutral' },
        },
        required: [],
        additionalProperties: false,
      },
      example: '<Badge tone="accent">Astro 7</Badge>',
    },
  },
};
