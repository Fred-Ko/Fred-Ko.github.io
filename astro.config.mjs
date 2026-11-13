// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { satteri, satteriHeadingIdsPlugin } from '@astrojs/markdown-satteri';
import {
  transformerMetaHighlight,
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
} from '@shikijs/transformers';
import { catalogGuard, codeFrame, headingAnchors, obsidianCallouts, tableWrapper } from './src/lib/markdown.mjs';

export default defineConfig({
  site: 'https://fredko.kr',
  vite: { server: { proxy: { '/api': 'http://127.0.0.1:8788' } } },
  trailingSlash: 'always',
  integrations: [mdx()],
  markdown: {
    // Astro 7 기본 처리기(Sätteri). .md와 .mdx 모두 이 처리기를 쓴다.
    processor: satteri({
      features: {
        rawHtml: true,
        gfm: {
          footnotes: { label: '각주', backContent: '↩', backLabel: '본문 {reference}로 돌아가기' },
        },
      },
      mdastPlugins: [catalogGuard],
      hastPlugins: [satteriHeadingIdsPlugin(), headingAnchors, tableWrapper, obsidianCallouts],
    }),
    syntaxHighlight: 'shiki',
    shikiConfig: {
      // defaultColor: false → 두 테마 모두 CSS 변수로만 출력, prose.css의 light-dark()가 선택.
      // 두 테마 모두 본문·주석 대비 WCAG AA(4.5:1) 이상.
      themes: {
        light: 'github-light-default',
        dark: 'vitesse-dark',
      },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerNotationHighlight(),
        transformerNotationDiff(),
        transformerNotationFocus(),
        transformerMetaHighlight(),
        codeFrame,
      ],
    },
  },
});
