import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { postSchema, type PostData } from './schema.ts';

export interface PostSource {
  filePath: string;
  data: PostData;
}

export function parsePostSource(contents: string, filePath: string): PostSource {
  const frontmatter = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(contents);
  if (!frontmatter) throw new Error(`${filePath}: YAML 프론트매터가 필요합니다.`);
  try {
    return { filePath, data: postSchema.parse(parse(frontmatter[1], { uniqueKeys: true })) };
  } catch (error) {
    throw new Error(`${filePath}: 글 정보 검증 실패\n${error instanceof Error ? error.message : String(error)}`);
  }
}

export function assertUniquePosts(posts: PostSource[]): void {
  for (const field of ['post_id', 'nanoId'] as const) {
    const seen = new Map<string, string>();
    for (const { filePath, data } of posts) {
      const previous = seen.get(data[field]);
      if (previous !== undefined) {
        throw new Error(`중복된 ${field} '${data[field]}': ${previous}, ${filePath}`);
      }
      seen.set(data[field], filePath);
    }
  }
}

/** 숨김·보관 폴더와 심볼릭 링크는 읽지 않는다. 비공개 글도 검증 대상이다. */
export async function readPostSources(base: string): Promise<PostSource[]> {
  const posts: PostSource[] = [];
  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'ko'))) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      const file = join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) {
        posts.push(parsePostSource(await readFile(file, 'utf8'), relative(base, file)));
      }
    }
  }
  await walk(base);
  assertUniquePosts(posts);
  return posts;
}
