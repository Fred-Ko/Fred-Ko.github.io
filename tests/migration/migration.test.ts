import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, cp, writeFile, rm, symlink, access, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { markdownToMdast } from 'satteri';
import { migrateBody, planMigration } from '../../scripts/migration/lib/migrate-posts.ts';
import { parsePostSource, readPostSources } from '../../src/lib/posts/sources.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
function codeBlocks(source: string): string[] {
  const found: string[] = [];
  const visit = (node: any) => {
    if (node.type === 'code' || node.type === 'inlineCode') found.push(node.value);
    for (const child of node.children ?? []) visit(child);
  };
  visit(markdownToMdast(source));
  return found;
}

test('본문 변환은 코드 예시를 보존하고 이미지 크기·대체 텍스트·수식만 처리한다', () => {
  const image = 'assets/img/pasted-image-20241211013304.png';
  const code = `![코드 예시](${image}){:width="390px"}`;
  const body = `한글 앞부분 😀\n\n![](${image}){:width="390px"}\n\n\`![](${image})\`\n\n\`\`\`md\n${code}\n\`\`\`\n\n수식 \\( T_1, T_2, \\dots, T_n \\)\n\n설명 {:width="820px"}`;
  const converted = migrateBody(body);
  assert.ok(converted.body.startsWith('한글 앞부분 😀'));
  assert.match(converted.body, /<img src="\/assets\/img\/[^\"]+" alt="[^\"]+" width="390" height="208"/);
  assert.ok(converted.body.includes(code));
  assert.ok(converted.body.includes(`\`![](${image})\``));
  assert.ok(converted.body.includes('T₁, T₂, …, Tₙ'));
  assert.ok(converted.body.includes('`{:width="820px"}`'));
  assert.deepEqual(converted.stats, { images: 1, altAdded: 1, imageWidths: 1, widthExamples: 1, formulas: 1 });
});

test('원고 28개의 ID·URL·기존 메타데이터·코드 블록과 이전 결과를 대조한다', async () => {
  const planned = await planMigration(root);
  const posts = await readPostSources(join(root, 'src/content/posts'));
  assert.equal(planned.length, 28);
  assert.equal(posts.length, 28);
  for (const { content, record } of planned) {
    const source = await readFile(join(root, record.source), 'utf8');
    const target = await readFile(join(root, record.target), 'utf8');
    assert.equal(target, content, record.source);
    const original = parsePostSource(source, record.source).data;
    const migrated = parsePostSource(target, record.target).data;
    assert.deepEqual({ ...migrated, categories: [] }, original);
    assert.deepEqual(migrated.categories, record.categories);
    assert.ok(migrated.categories.includes('블로그'));
    // 문법 설명을 인라인 코드로 바꾼 1곳을 제외한 기존 코드는 모두 남는다.
    const originalCodes = codeBlocks(source);
    const targetCodes = codeBlocks(target);
    assert.deepEqual(targetCodes.filter(code => !(record.widthExamples && code === '{:width="820px"}')), originalCodes, `${record.source}: 코드 손실`);
  }
  const totals = planned.reduce((sum, { record }) => {
    for (const key of ['images', 'altAdded', 'imageWidths', 'widthExamples', 'formulas'] as const) sum[key] = (sum[key] ?? 0) + record[key];
    return sum;
  }, {} as Record<string, number>);
  assert.deepEqual(totals, { images: 27, altAdded: 26, imageWidths: 3, widthExamples: 1, formulas: 2 });
  execFileSync(process.execPath, ['scripts/migration/migrate-posts.ts', '--check'], { cwd: root, stdio: 'pipe' });
});

test('실제 원고 28개를 모두 렌더링하여 이미지·표 줄바꿈·콜아웃을 확인한다', async () => {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'fredko-migration-render-')));
  try {
    await cp(join(root, 'src'), join(dir, 'src'), { recursive: true });
    await cp(join(root, 'docs'), join(dir, 'docs'), { recursive: true });
    await cp(join(root, 'astro.config.mjs'), join(dir, 'astro.config.mjs'));
    await cp(join(root, 'tsconfig.json'), join(dir, 'tsconfig.json'));
    await symlink(join(root, 'public'), join(dir, 'public'), 'dir');
    await symlink(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
    await writeFile(join(dir, 'package.json'), '{"type":"module"}');
    await writeFile(join(dir, 'src/pages/[nanoId].astro'), `---
      import { getCollection, render } from 'astro:content';
      import BaseLayout from '../layouts/BaseLayout.astro';
      export async function getStaticPaths() { return (await getCollection('posts')).map(post => ({ params: { nanoId: post.data.nanoId }, props: { post } })); }
      const { post } = Astro.props;
      const { Content } = await render(post);
      ---
      <BaseLayout title={post.data.title}><article class="container prose" data-pagefind-body><h1>{post.data.title}</h1><Content /></article></BaseLayout>`);
    execFileSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', dir], { cwd: dir, encoding: 'utf8', stdio: 'pipe', timeout: 60000 });
    const planned = await planMigration(root);
    let images = 0, breaks = 0;
    for (const { content, record } of planned) {
      const page = await readFile(join(dir, 'dist', record.nanoId, 'index.html'), 'utf8');
      const html = /<article\b[^>]*>([\s\S]*?)<\/article>/.exec(page)?.[1];
      assert.ok(html, record.nanoId);
      assert.ok(html.includes('<h1>'), record.nanoId);
      const renderedImages = [...html.matchAll(/<img\b[^>]*>/g)];
      assert.equal(renderedImages.length, record.images, record.nanoId);
      for (const [image] of renderedImages) {
        const src = /src="([^"]+)"/.exec(image)?.[1];
        assert.ok(src?.startsWith('/assets/img/'), image);
        assert.match(image, /alt="[^"]+"/);
        assert.match(image, /width="[1-9]\d*"/);
        assert.match(image, /height="[1-9]\d*"/);
        await access(join(dir, 'dist', src!));
      }
      images += renderedImages.length;
      const originalBreaks = [...content.matchAll(/<br\s*\/?>/g)].length;
      const tableHtml = [...html.matchAll(/<table\b[\s\S]*?<\/table>/g)].map(([table]) => table).join('');
      const renderedBreaks = [...tableHtml.matchAll(/<br\s*\/?>/g)].length;
      assert.equal(renderedBreaks, originalBreaks, `${record.nanoId}: 표 줄바꿈`);
      breaks += renderedBreaks;
      if (content.includes('[!CAUTION]')) assert.match(html, /class="callout"[^>]*data-type="warning"/);
      if (record.formulas) assert.ok(html.includes('T₁, T₂, …, Tₙ') && html.includes('C₁, C₂, …, Cᵢ₋₁'));
      if (record.imageWidths) {
        for (const match of content.matchAll(/<img\b[^>]+width="(390|460|760)"[^>]*>/g)) assert.ok(html.includes(match[0].slice(0, -1)), match[0]);
      }
    }
    assert.equal(images, 27);
    assert.equal(breaks, 23);
    assert.match(await readFile(join(dir, 'dist/ewIpCLwxS9u7f6iptneNLTbiF/index.html'), 'utf8'), /class="table-wrapper"/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
