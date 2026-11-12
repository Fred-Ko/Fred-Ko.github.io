// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';
import { defineHastPlugin } from 'satteri';

/**
 * 코드 블록의 각 줄에 data-line 속성을 붙여 CSS 카운터 없이 줄 번호를 표시한다.
 * @type {import('shiki').ShikiTransformer}
 */
const lineNumbers = {
  name: 'fredko:line-numbers',
  line(node, line) {
    node.properties['data-line'] = String(line);
  },
  pre(node) {
    this.addClassToHast(node, 'fredko-shiki');
  },
};

/**
 * 마크다운 표를 <div class="table-wrapper">로 감싼다.
 * 표는 table 레이아웃(행이 전체 폭을 채움)을 유지하고, 가로 스크롤은 래퍼가 담당한다.
 * Sätteri는 visit()이 반환한 노드로 교체한다. 트리 안의 노드를 그대로 넣을 수 없어 structuredClone 사용.
 */
const tableWrapper = defineHastPlugin({
  name: 'fredko:table-wrapper',
  element: {
    filter: ['table'],
    visit(node) {
      return {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrapper'] },
        children: [structuredClone(node)],
      };
    },
  },
});

export default defineConfig({
  site: 'https://fredko.kr',
  trailingSlash: 'always',
  integrations: [mdx()],
  markdown: {
    // Astro 7 기본 처리기(Sätteri). .md와 .mdx 모두 이 처리기를 쓴다.
    processor: satteri({
      hastPlugins: [tableWrapper],
    }),
    syntaxHighlight: 'shiki',
    shikiConfig: {
      // 기존 블로그와 동일한 테마 쌍. defaultColor: false → 두 테마 모두 CSS 변수로만 출력되고
      // 실제 색 선택은 prose.css의 [data-theme] 셀렉터가 담당한다.
      themes: {
        light: 'material-theme-lighter',
        dark: 'vitesse-dark',
      },
      defaultColor: false,
      wrap: false,
      transformers: [lineNumbers],
    },
  },
});
