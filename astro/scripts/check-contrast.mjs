#!/usr/bin/env node
// tokens.css의 OKLCH 원시 색을 읽어 주요 텍스트/배경 조합의 WCAG 대비를 검사한다.
// 본문·메타 텍스트는 4.5:1, 장식(줄 번호)은 3:1 이상이어야 통과.
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const prim = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/g)].map((m) => [m[1], [+m[2] / 100, +m[3], +m[4]]]),
);

function oklchToLinearRgb([L, C, H]) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)));
}
const lum = (name) => {
  const [r, g, b] = oklchToLinearRgb(prim[name]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [테마, 역할, 전경, 배경, 최소 대비]
const pairs = [
  ['dark', '제목 fg-strong', 'ink-100', 'ink-950', 4.5],
  ['dark', '본문 fg-prose', 'ink-150', 'ink-950', 4.5],
  ['dark', '보조 fg-muted', 'ink-300', 'ink-950', 4.5],
  ['dark', '메타 fg-subtle', 'ink-450', 'ink-950', 4.5],
  ['dark', '메타 on 카드', 'ink-450', 'ink-875', 4.5],
  ['dark', '링크 lime', 'lime-400', 'ink-950', 4.5],
  ['dark', '포인트 위 글자', 'ink-950', 'lime-400', 4.5],
  ['dark', '줄 번호(장식)', 'ink-500', 'code-ink', 3],
  ['light', '제목 fg-strong', 'graphite-1000', 'paper-50', 4.5],
  ['light', '본문 fg-prose', 'graphite-800', 'paper-50', 4.5],
  ['light', '보조 fg-muted', 'graphite-650', 'paper-50', 4.5],
  ['light', '메타 fg-subtle', 'graphite-550', 'paper-50', 4.5],
  ['light', '메타 on 헤더', 'graphite-550', 'paper-100', 4.5],
  ['light', '줄 번호(장식)', 'graphite-400', 'paper-0', 2],
];

let failed = false;
for (const [theme, role, fg, bg, min] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed = true;
  console.log(`${ok ? '✓' : '✗'} ${theme.padEnd(5)} ${role.padEnd(16)} ${r.toFixed(2).padStart(5)}:1 (기준 ${min})`);
}
process.exit(failed ? 1 : 0);
