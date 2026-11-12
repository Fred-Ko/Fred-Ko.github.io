// @ts-check
/**
 * Markdown/MDX 빌드 플러그인 모음 (Astro 7 Sätteri 처리기 + Shiki transformer).
 * 브라우저에서 돌지 않는다 — 전부 빌드 타임.
 */
import { defineHastPlugin, defineMdastPlugin } from 'satteri';
import { fileURLToPath } from 'node:url';
import { catalog } from '../catalog/catalog.mjs';

/* ───────────────────────── HAST 플러그인 ───────────────────────── */

/** 제목(h2~h4)에 `#` 앵커 링크를 붙인다. satteriHeadingIdsPlugin() 뒤에 둬야 id가 있다. */
export const headingAnchors = defineHastPlugin({
  name: 'fredko:heading-anchors',
  element: {
    filter: ['h2', 'h3', 'h4'],
    visit(node, ctx) {
      const id = node.properties?.id;
      if (typeof id !== 'string' || !id) return;
      ctx.appendChild(node, {
        type: 'element',
        tagName: 'a',
        properties: {
          className: ['heading-anchor'],
          href: `#${id}`,
          ariaLabel: '이 섹션 링크',
        },
        // '#'는 CSS ::after로 그린다 — 텍스트 노드를 두면 목차(headings)와 검색 인덱스에 섞인다
        children: [],
      });
    },
  },
});

/** 표를 <div class="table-wrapper">로 감싼다 — 가로 스크롤은 래퍼가, 표는 전체 폭을 유지. */
export const tableWrapper = defineHastPlugin({
  name: 'fredko:table-wrapper',
  element: {
    filter: ['table'],
    visit(node, ctx) {
      ctx.wrapNode(node, {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrapper'] },
        children: [],
      });
    },
  },
});

const CALLOUT_TYPES = /** @type {const} */ ({
  note: 'note', info: 'note', abstract: 'note', summary: 'note', quote: 'note', example: 'note',
  tip: 'tip', hint: 'tip', important: 'tip', success: 'tip', check: 'tip', done: 'tip',
  warning: 'warning', caution: 'warning', attention: 'warning', question: 'warning', help: 'warning',
  danger: 'danger', error: 'danger', bug: 'danger', failure: 'danger', fail: 'danger',
});
const CALLOUT_LABEL = { note: 'Note', tip: 'Tip', warning: 'Warning', danger: 'Danger' };

/**
 * Obsidian/GitHub 콜아웃 문법을 .callout 마크업으로 바꾼다.
 *   > [!warning] 제목(선택)
 *   > 본문
 * <Callout> 컴포넌트와 같은 마크업이라 .md 글도 MDX 없이 콜아웃을 쓸 수 있다.
 */
export const obsidianCallouts = defineHastPlugin({
  name: 'fredko:obsidian-callouts',
  element: {
    filter: ['blockquote'],
    visit(node, ctx) {
      const children = node.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
      const first = children[0];
      if (!first || first.type !== 'element' || first.tagName !== 'p') return;
      const head = first.children[0];
      if (!head || head.type !== 'text') return;

      const match = /^\[!(\w+)\][+-]?[ \t]*([^\n]*)(?:\n|$)/.exec(head.value);
      if (!match) return;
      const kind = CALLOUT_TYPES[/** @type {keyof typeof CALLOUT_TYPES} */ (match[1].toLowerCase())] ?? 'note';
      const title = match[2].trim() || CALLOUT_LABEL[kind];

      // 첫 문단에서 [!type] 줄을 걷어낸 나머지
      const restText = head.value.slice(match[0].length);
      const restOfFirst = [
        ...(restText ? [{ type: 'text', value: restText }] : []),
        ...first.children.slice(1).map((c) => structuredClone(c)),
      ];
      const body = [
        ...(restOfFirst.some((c) => c.type !== 'text' || c.value.trim())
          ? [{ type: 'element', tagName: 'p', properties: {}, children: restOfFirst }]
          : []),
        ...children.slice(1).map((c) => structuredClone(c)),
      ];

      ctx.replaceNode(node, /** @type {any} */ ({
        type: 'element',
        tagName: 'aside',
        properties: { className: ['callout'], dataType: kind, role: 'note' },
        children: [
          { type: 'element', tagName: 'p', properties: { className: ['callout-title'] }, children: [{ type: 'text', value: title }] },
          { type: 'element', tagName: 'div', properties: { className: ['callout-body'] }, children: body },
        ],
      }));
    },
  },
});

/* ───────────────────────── MDAST 플러그인 ───────────────────────── */

const HTML_LIKE = /^[a-z]/;

/**
 * MDX에서 쓰는 JSX 컴포넌트를 카탈로그(src/catalog/catalog.mjs)와 대조한다.
 * 카탈로그에 없는 컴포넌트나 필수 속성 누락은 빌드를 실패시킨다.
 * (A2UI의 "승인된 컴포넌트만 렌더링" 원칙을 빌드 타임에 적용)
 */
function checkJsx(/** @type {any} */ node, /** @type {any} */ ctx) {
  const name = node.name;
  if (!name || HTML_LIKE.test(name) || name.includes('.')) return;
  const where = ctx.fileURL ? fileURLToPath(ctx.fileURL) : '(unknown file)';
  const line = node.position?.start?.line;
  const loc = line ? `${where}:${line}` : where;

  const spec = catalog.components[name];
  if (!spec) {
    const known = Object.keys(catalog.components).join(', ');
    throw new Error(`[catalog] ${loc} — <${name}>은(는) 카탈로그에 없는 컴포넌트입니다. 사용 가능: ${known}`);
  }
  const given = new Set(
    (node.attributes ?? []).filter((a) => a.type === 'mdxJsxAttribute').map((a) => a.name),
  );
  const spread = (node.attributes ?? []).some((a) => a.type === 'mdxJsxExpressionAttribute');
  if (spread) return;
  for (const req of spec.props.required ?? []) {
    if (!given.has(req)) throw new Error(`[catalog] ${loc} — <${name}>에 필수 속성 '${req}'이(가) 없습니다.`);
  }
  for (const attr of given) {
    if (!(attr in (spec.props.properties ?? {}))) {
      throw new Error(`[catalog] ${loc} — <${name}>은(는) '${attr}' 속성을 받지 않습니다.`);
    }
  }
}

export const catalogGuard = defineMdastPlugin({
  name: 'fredko:catalog-guard',
  mdxJsxFlowElement: checkJsx,
  mdxJsxTextElement: checkJsx,
});

/* ───────────────────────── Shiki transformers ───────────────────────── */

const COLLAPSE_AFTER_LINES = 28;

/**
 * 코드 블록 프레임:
 *  - 각 줄에 data-line (CSS 줄 번호)
 *  - <figure class="code-block"> + 헤더(파일명 title, 언어, 복사 버튼)
 *  - 긴 블록은 data-collapsible (실제 접힘은 JS가 결정)
 * 사용: ```kotlin title="Order.kt"
 * @type {import('shiki').ShikiTransformer}
 */
export const codeFrame = {
  name: 'fredko:code-frame',
  line(node, line) {
    node.properties['data-line'] = String(line);
  },
  pre(node) {
    this.addClassToHast(node, 'fredko-shiki');
  },
  root(root) {
    const pre = root.children.find((c) => c.type === 'element' && c.tagName === 'pre');
    if (!pre || pre.type !== 'element') return;
    const raw = /** @type {any} */ (this.options.meta)?.__raw ?? '';
    const title = /title=(?:"([^"]+)"|'([^']+)')/.exec(raw);
    const lang = this.options.lang && this.options.lang !== 'plaintext' ? this.options.lang : 'text';
    const code = pre.children.find((c) => c.type === 'element' && c.tagName === 'code');
    const lineCount =
      code && code.type === 'element' ? code.children.filter((c) => c.type === 'element').length : 0;

    /** @type {any[]} */
    const header = [];
    if (title) {
      header.push({ type: 'element', tagName: 'span', properties: { className: ['code-title'] }, children: [{ type: 'text', value: title[1] ?? title[2] }] });
    }
    header.push(
      { type: 'element', tagName: 'span', properties: { className: ['code-lang'] }, children: [{ type: 'text', value: lang }] },
      {
        type: 'element',
        tagName: 'button',
        properties: { type: 'button', className: ['code-copy'], hidden: true, ariaLabel: '코드 복사' },
        children: [{ type: 'text', value: 'Copy' }],
      },
    );

    root.children = [
      {
        type: 'element',
        tagName: 'figure',
        properties: {
          className: ['code-block'],
          dataLang: lang,
          ...(lineCount > COLLAPSE_AFTER_LINES ? { dataCollapsible: '' } : {}),
        },
        children: [
          { type: 'element', tagName: 'figcaption', properties: { className: ['code-header'] }, children: header },
          pre,
        ],
      },
    ];
  },
};
