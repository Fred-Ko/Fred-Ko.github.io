import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { planMigration } from './lib/migrate-posts.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const check = process.argv.includes('--check');
const planned = await planMigration(root);
if (planned.length !== 28) throw new Error(`이전 대상은 28개여야 합니다: ${planned.length}`);
// 모든 파일을 먼저 검증한 뒤 기록한다.
const missing = new Set<string>();
for (const { content, record } of planned) {
  const target = join(root, record.target);
  try {
    const existing = await readFile(target, 'utf8');
    if (existing !== content) throw new Error(`${record.target}: 내용이 달라 덮어쓰지 않습니다.`);
  } catch (error: any) {
    if (error.code !== 'ENOENT' || check) throw error;
    missing.add(record.target);
  }
  for (const src of content.matchAll(/<img src="([^"]+)"/g)) await access(join(root, 'public', src[1]));
}
const manifestPath = join(root, 'docs/migration/posts-manifest.json');
const manifest = JSON.stringify(planned.map(({ record }) => record), null, 2)+'\n';
if (check) {
  if (await readFile(manifestPath, 'utf8') !== manifest) throw new Error('이전 기록이 원고와 일치하지 않습니다.');
} else {
  for (const { content, record } of planned) {
    if (!missing.has(record.target)) continue;
    await mkdir(dirname(join(root, record.target)), { recursive: true });
    await writeFile(join(root, record.target), content);
  }
  await writeFile(manifestPath, manifest);
}
console.log(`원고 ${planned.length}개 ${check ? '대조 검증' : '이전'} 완료`);
