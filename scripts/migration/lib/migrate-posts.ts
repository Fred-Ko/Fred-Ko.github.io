import { readFile, glob } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { markdownToMdast } from 'satteri';
import { parsePostSource, assertUniquePosts } from '../../../src/lib/posts/sources.ts';
import images from './post-images.json' with { type: 'json' };

type Node = Awaited<ReturnType<typeof markdownToMdast>>['children'][number];
type Edit = { start: number; end: number; value: string };
export type MigrationStats = { images: number; altAdded: number; imageWidths: number; widthExamples: number; formulas: number };
const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
function walk(nodes: Node[], visit: (node: Node) => void) {
  for (const node of nodes) {
    visit(node);
    if ('children' in node) walk(node.children as Node[], visit);
  }
}
function applyEdits(text: string, edits: Edit[]): string {
  let boundary = text.length;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    if (edit.end > boundary) throw new Error('겹치는 본문 변환 범위입니다.');
    text = text.slice(0, edit.start) + edit.value + text.slice(edit.end);
    boundary = edit.start;
  }
  return text;
}

/** AST의 소스 위치만 편집하여 코드 블록·인라인 코드·나머지 본문을 보존한다. */
export function migrateBody(body: string): { body: string; stats: MigrationStats } {
  const stats: MigrationStats = { images: 0, altAdded: 0, imageWidths: 0, widthExamples: 0, formulas: 0 };
  const edits: Edit[] = [];
  walk(markdownToMdast(body).children, (node) => {
    if (node.type !== 'image') return;
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined || !body.slice(start, end).startsWith('![')) throw new Error('이미지 소스 위치를 확인할 수 없습니다.');
    const src = node.url.startsWith('assets/img/') ? `/${node.url}` : node.url;
    const metadata = images[src as keyof typeof images];
    if (!metadata) throw new Error(`이미지 설명·크기를 확인해야 합니다: ${src}`);
    const alt = node.alt?.trim() || metadata.alt;
    const size = /^\{:\s*width="(\d+)px"\}/.exec(body.slice(end));
    const width = size ? Number(size[1]) : metadata.width;
    const height = Math.round(metadata.height * width / metadata.width);
    edits.push({ start, end: end + (size?.[0].length ?? 0), value: `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="${width}" height="${height}" loading="lazy" decoding="async"${node.title ? ` title="${escapeHtml(node.title)}"` : ''}>` });
    stats.images++;
    if (!node.alt?.trim()) stats.altAdded++;
    if (size) stats.imageWidths++;
  });
  body = applyEdits(body, edits);
  const textEdits: Edit[] = [];
  walk(markdownToMdast(body).children, (node) => {
    if (node.type !== 'text' || node.position?.start.offset === undefined || node.position?.end.offset === undefined) return;
    const start = node.position.start.offset;
    const raw = body.slice(start, node.position.end.offset);
    const converted = raw.replace(/\\\(\s*T_1,\s*T_2,\s*\\dots,\s*T_n\s*\\\)/g, () => {
      stats.formulas++;
      return 'T₁, T₂, …, Tₙ';
    }).replace(/\\\(\s*C_1,\s*C_2,\s*\\dots,\s*C_\{i-1\}\s*\\\)/g, () => {
      stats.formulas++;
      return 'C₁, C₂, …, Cᵢ₋₁';
    }).replace(/\{:\s*width="\d+px"\}/g, (match) => {
      stats.widthExamples++;
      return '`'+match+'`';
    });
    if (converted !== raw) textEdits.push({ start, end: node.position.end.offset, value: converted });
  });
  return { body: applyEdits(body, textEdits), stats };
}

export async function planMigration(root: string) {
  const result = [];
  const validated = [];
  for await (const source of glob('블로그/**/_posts/*.md', { cwd: root })) {
    const original = await readFile(join(root, source), 'utf8');
    const post = parsePostSource(original, source);
    validated.push(post);
    const frontmatter = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(original)!;
    const rawData = parse(frontmatter[1]);
    if (rawData.categories !== undefined) throw new Error(`${source}: 기존 categories와 폴더 매핑을 확인해야 합니다.`);
    // Jekyll이 폴더에서 추출하던 상위 '블로그' 카테고리도 보존한다.
    const categories = relative(root, join(root, source)).split(/[\\/]/).slice(0, -2);
    const migrated = migrateBody(original.slice(frontmatter[0].length));
    const content = `---\n${frontmatter[1]}\ncategories:\n${categories.map((category) => `  - ${JSON.stringify(category)}`).join('\n')}\n---\n${migrated.body}`;
    const target = `src/content/posts/${post.data.nanoId}.md`;
    result.push({ content, record: {
      source, target, post_id: post.data.post_id, nanoId: post.data.nanoId, permalink: post.data.permalink,
      categories, sourceSha256: hash(original), targetSha256: hash(content), ...migrated.stats,
    } });
  }
  assertUniquePosts(validated);
  return result.sort((a,b) => a.record.nanoId.localeCompare(b.record.nanoId, 'en'));
}
