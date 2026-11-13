/**
 * OG 이미지(1200×630 PNG) 생성 — satori(SVG) → resvg(PNG). 빌드 타임 전용.
 * 디자인 토큰과 같은 값을 쓴다(다크 테마 고정: SNS 미리보기에서 가장 눈에 띔).
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const font = (spec: string) => readFile(require.resolve(spec));

const fontsPromise = Promise.all([
  font('@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff'),
  font('pretendard/dist/public/static/Pretendard-SemiBold.otf'),
  font('pretendard/dist/public/static/Pretendard-Regular.otf'),
]);

const C = {
  bg: '#08090b',
  line: '#292c32',
  strong: '#f1f2ee',
  muted: '#aeb3bc',
  subtle: '#7f858f',
  accent: '#d8ff3e',
};

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

export interface OgInput {
  title: string;
  kicker?: string;
  description?: string;
}

export async function renderOg({ title, kicker = 'Fredko Dev Log', description }: OgInput): Promise<Uint8Array> {
  const [grotesk, pretendardSemi, pretendardRegular] = await fontsPromise;
  const titleSize = title.length > 60 ? 48 : title.length > 36 ? 60 : title.length > 22 ? 72 : 88;

  const tree = h(
    'div',
    {
      // satori는 content-box — padding(72/80)을 뺀 크기를 줘야 캔버스(1200×630)에 맞는다
      width: 1200 - 160,
      height: 630 - 144,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      background: `radial-gradient(circle at 12% -20%, rgba(216,255,62,0.12), transparent 520px), ${C.bg}`,
      color: C.strong,
      fontFamily: 'Space Grotesk, Pretendard',
    },
    [
      h('div', { display: 'flex', gap: 18, fontSize: 22, fontWeight: 600, letterSpacing: 3, color: C.accent, textTransform: 'uppercase' }, kicker),
      h('div', { display: 'flex', flexDirection: 'column', gap: 24 }, [
        h('div', { fontSize: titleSize, fontWeight: 600, lineHeight: 1.15, letterSpacing: -2, wordBreak: 'keep-all', maxHeight: 240, overflow: 'hidden', lineClamp: 3 }, title),
        ...(description
          ? [h('div', { fontSize: 24, maxHeight: 96, lineClamp: 3, overflow: 'hidden', fontWeight: 400, lineHeight: 1.5, color: C.muted, fontFamily: 'Pretendard' }, description)]
          : []),
      ]),
      h(
        'div',
        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 28, borderTop: `1px solid ${C.line}`, fontSize: 24, color: C.subtle },
        [
          h('div', { display: 'flex', fontWeight: 600, color: C.strong, fontSize: 30 }, [
            h('span', {}, 'Fredko'),
            h('span', { color: C.accent }, '.'),
          ]),
          h('div', { display: 'flex', letterSpacing: 2 }, 'FREDKO.KR'),
        ],
      ),
    ],
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Space Grotesk', data: grotesk, weight: 600, style: 'normal' },
      { name: 'Pretendard', data: pretendardSemi, weight: 600, style: 'normal' },
      { name: 'Pretendard', data: pretendardRegular, weight: 400, style: 'normal' },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
