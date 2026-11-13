import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { stringify } from 'yaml';
import { postSchema, isPublished } from '../src/lib/posts/schema.ts';
import { parsePostSource, assertUniquePosts, readPostSources } from '../src/lib/posts/sources.ts';

const valid = {
  post_id: '19cc4d93-4e44-4f15-bc84-17bfad6eef61',
  title: '검증할 글',
  datetime: '2026-01-01T00:00:00.000Z',
  nanoId: 'sI3gN7kSmw4apJNMaYK57ljMd',
  permalink: '/sI3gN7kSmw4apJNMaYK57ljMd/',
};
const markdown = (data: object, body = '본문') => `---\n${stringify(data)}---\n${body}\n`;
const root = fileURLToPath(new URL('../', import.meta.url));

test('필수 정보·UUID·시간대·날짜·URL을 검증한다', () => {
  const data = postSchema.parse(valid);
  assert.ok(data.datetime instanceof Date);
  assert.deepEqual(data.tags, []);
  for (const patch of [
    { post_id: '' }, { post_id: '잘못된 ID' }, { title: ' ' },
    { datetime: '2026-02-30T00:00:00Z' }, { datetime: '2026-01-01' }, { datetime: 123 },
    { nanoId: '../about' }, { nanoId: '공백 포함' }, { permalink: '/posts/다른주소/' },
    { published: 'false' }, { draft: 'true' },
  ]) assert.equal(postSchema.safeParse({ ...valid, ...patch }).success, false, JSON.stringify(patch));
  for (const field of ['post_id','title','datetime','nanoId','permalink']) {
    const copy = { ...valid } as Record<string, unknown>;
    delete copy[field];
    assert.equal(postSchema.safeParse(copy).success, false, field);
  }
  assert.equal(postSchema.parse({ ...valid, datetime: new Date(valid.datetime) }).datetime.toISOString(), valid.datetime);
});

test('비공개·초안·미래 글은 공개하지 않으며 발행 시각부터 공개한다', () => {
  const now = new Date(valid.datetime);
  assert.equal(isPublished(postSchema.parse(valid), now), true);
  for (const patch of [{ published: false }, { draft: true }, { datetime: '2099-01-01T00:00:00Z' }]) {
    assert.equal(isPublished(postSchema.parse({ ...valid, ...patch }), now), false);
  }
});

test('비공개 글을 포함해 UUID 대소문자 중복과 nanoId 중복을 차단한다', () => {
  const first = parsePostSource(markdown(valid), '첫째.md');
  for (const patch of [
    { post_id: valid.post_id.toUpperCase(), nanoId: 'other', permalink: '/other/', published: false },
    { post_id: 'bffdd6a8-abe7-42bc-9e05-891847833381', draft: true },
  ]) {
    const second = parsePostSource(markdown({ ...valid, ...patch }), '둘째.mdx');
    assert.throws(() => assertUniquePosts([first, second]), /중복된.*첫째.md, 둘째.mdx/);
  }
});

test('YAML 누락·중복 키·잘못된 형식을 파일명과 함께 알린다', () => {
  for (const contents of ['제목만 있음', '---\ntitle: 첫째\ntitle: 둘째\n---\n본문', '---\n[잘못된 YAML\n---\n']) {
    assert.throws(() => parsePostSource(contents, '문제.md'), /문제.md:/);
  }
});

test('숨김·보관 폴더와 심볼릭 링크는 컬렉션 소스에서 제외한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fredko-post-sources-'));
  try {
    await writeFile(join(dir, '공개.md'), markdown(valid));
    for (const folder of ['.hidden','_removed_posts']) {
      await mkdir(join(dir, folder));
      await writeFile(join(dir, folder, '잘못된.md'), '검증 대상이면 실패할 원고');
    }
    await symlink(join(dir, '공개.md'), join(dir, '중복.mdx'));
    assert.equal((await readPostSources(dir)).length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('현재 MD·MDX 원고 전체의 스키마와 식별자를 검증한다', async () => {
  await readPostSources(join(root, 'src/content/posts'));
});

test('실제 Astro 빌드: 공개 MD·MDX만 렌더링하고 캐시 전환·중복 오류를 처리한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fredko-post-build-'));
  try {
    await symlink(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
    await mkdir(join(dir, 'src/content/posts/_removed_posts'), { recursive: true });
    await mkdir(join(dir, 'src/pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), '{"type":"module"}');
    await writeFile(join(dir, 'astro.config.mjs'), "import mdx from '@astrojs/mdx'; export default { integrations: [mdx()], site: 'https://fredko.kr' };");
    await writeFile(join(dir, 'src/content.config.ts'), `
      import { defineCollection } from 'astro:content';
      import { postsLoader } from ${JSON.stringify(join(root, 'src/lib/posts/loader.ts'))};
      import { postSchema } from ${JSON.stringify(join(root, 'src/lib/posts/schema.ts'))};
      export const collections = { posts: defineCollection({ loader: postsLoader(new URL('./content/posts/', import.meta.url)), schema: postSchema }) };
    `);
    await writeFile(join(dir, 'src/pages/index.astro'), `---\nimport { getCollection } from 'astro:content';\nconst posts = await getCollection('posts');\n---\n<pre>{JSON.stringify(posts.map(p => p.id).sort())}</pre>`);
    await writeFile(join(dir, 'src/pages/[id].astro'), `---
      import { getCollection, render } from 'astro:content';
      export async function getStaticPaths() { return (await getCollection('posts')).map(post => ({ params: { id: post.id }, props: { post } })); }
      const { Content } = await render(Astro.props.post);
      ---\n<Content />`);
    const postDir = join(dir, 'src/content/posts');
    const make = (id: string, uuid: string, extra = {}) => ({ ...valid, nanoId: id, permalink: `/${id}/`, post_id: uuid, ...extra });
    await writeFile(join(postDir, 'public.md'), markdown(valid, '# 공개 본문'));
    await writeFile(join(postDir, '제목(예시)[1].mdx'), markdown(make('public-mdx','bffdd6a8-abe7-42bc-9e05-891847833381'), '<p>MDX 공개 본문</p>'));
    await writeFile(join(postDir, 'private.mdx'), markdown(make('private','891e37e1-6d2e-4502-9f20-a9515b16534d',{ published: false }), 'PRIVATE_SECRET'));
    await writeFile(join(postDir, 'draft.md'), markdown(make('draft','c103ef1b-9a7d-47da-b952-de681360d1a7',{ draft: true }), 'DRAFT_SECRET'));
    await writeFile(join(postDir, 'future.md'), markdown(make('future','92a46271-1b07-5c8d-9dcc-cf0aa3c1b22a',{ datetime: '2099-01-01T00:00:00Z' }), 'FUTURE_SECRET'));
    await writeFile(join(postDir, '_removed_posts/deleted.md'), '잘못된 메타데이터');
    await symlink(join(postDir, 'public.md'), join(postDir, 'link.md'));
    const build = () => execFileSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', dir], { cwd: dir, encoding: 'utf8', stdio: 'pipe', timeout: 60000 });
    build();
    const html = await readFile(join(dir, 'dist/index.html'), 'utf8');
    assert.ok(html.includes(valid.nanoId) && html.includes('public-mdx'));
    for (const id of ['private','draft','future','deleted']) {
      assert.equal(html.includes(`&quot;${id}&quot;`), false);
      await assert.rejects(readFile(join(dir, `dist/${id}/index.html`)), { code: 'ENOENT' });
    }
    assert.match(await readFile(join(dir, `dist/${valid.nanoId}/index.html`), 'utf8'), /공개 본문/);
    assert.match(await readFile(join(dir, 'dist/public-mdx/index.html'), 'utf8'), /MDX 공개 본문/);
    await writeFile(join(postDir, 'public.md'), markdown({ ...valid, published: false }));
    build();
    assert.equal((await readFile(join(dir, 'dist/index.html'), 'utf8')).includes(valid.nanoId), false);
    await assert.rejects(readFile(join(dir, `dist/${valid.nanoId}/index.html`)), { code: 'ENOENT' });
    await writeFile(join(postDir, 'duplicate.md'), markdown(make('different',valid.post_id)));
    assert.throws(build, (error: any) => /중복된 post_id/.test(error.stdout + error.stderr));
    await writeFile(join(postDir, 'duplicate.md'), markdown(make('public-mdx','250a5b1f-cf36-593d-a54b-90d0410f0add')));
    assert.throws(build, (error: any) => /중복된 nanoId/.test(error.stdout + error.stderr));
    await writeFile(join(postDir, 'duplicate.md'), markdown({ ...valid, post_id: 'bad-uuid' }));
    assert.throws(build, (error: any) => /post_id는 UUID/.test(error.stdout + error.stderr));
    await rm(join(postDir, 'duplicate.md'));
    await rm(join(postDir, '제목(예시)[1].mdx'));
    build();
    assert.equal((await readFile(join(dir, 'dist/index.html'), 'utf8')).includes('public-mdx'), false);
    await assert.rejects(readFile(join(dir, 'dist/public-mdx/index.html')), { code: 'ENOENT' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
