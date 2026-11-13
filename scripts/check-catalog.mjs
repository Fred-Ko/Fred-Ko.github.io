#!/usr/bin/env node
// 카탈로그(src/catalog/catalog.mjs)와 실제 컴포넌트 Props가 어긋나지 않았는지 검사한다.
//  - 카탈로그의 모든 컴포넌트에 대응하는 .astro 파일이 있는가
//  - Props 이름 집합이 같은가, 필수(물음표 없는) 속성이 카탈로그 required와 같은가
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { catalog } from '../src/catalog/catalog.mjs';

const root = fileURLToPath(new URL('../src/', import.meta.url));
let failed = false;
const fail = (msg) => {
  failed = true;
  console.error(`✗ ${msg}`);
};

for (const [name, spec] of Object.entries(catalog.components)) {
  const file = spec.import.replace('@/', root);
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch {
    fail(`${name}: ${spec.import} 파일이 없습니다.`);
    continue;
  }
  const body = /interface Props\s*\{([\s\S]*?)\n\}/.exec(source)?.[1] ?? '';
  const props = [...body.matchAll(/^\s*(\w+)(\?)?\s*:/gm)].map((m) => ({ name: m[1], optional: !!m[2] }));

  const actual = new Set(props.map((p) => p.name));
  const declared = new Set(Object.keys(spec.props.properties ?? {}));
  for (const p of actual) if (!declared.has(p)) fail(`${name}: Props '${p}'가 카탈로그에 없습니다.`);
  for (const p of declared) if (!actual.has(p)) fail(`${name}: 카탈로그 속성 '${p}'가 컴포넌트 Props에 없습니다.`);

  const requiredActual = props.filter((p) => !p.optional).map((p) => p.name).sort().join(',');
  const requiredDeclared = [...(spec.props.required ?? [])].sort().join(',');
  if (requiredActual !== requiredDeclared) {
    fail(`${name}: 필수 속성 불일치 — 컴포넌트 [${requiredActual}] / 카탈로그 [${requiredDeclared}]`);
  }
}

if (failed) process.exit(1);
console.log(`✓ 카탈로그 ${Object.keys(catalog.components).length}개 컴포넌트가 Props와 일치합니다.`);
