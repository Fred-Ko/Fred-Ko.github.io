import { fileURLToPath } from 'node:url';
import { relative, isAbsolute, sep } from 'node:path';
import { glob, type Loader } from 'astro/loaders';
import { escapePath } from 'tinyglobby';
import { isPublished } from './schema.ts';
import { readPostSources } from './sources.ts';

/** 먼저 모든 메타데이터를 검증한 뒤 공개 글만 Astro 저장소에 넣는다. */
export function postsLoader(base: URL): Loader {
  return {
    name: 'validated-posts',
    async load(context) {
      const basePath = fileURLToPath(base);
      async function sync(): Promise<void> {
        const sources = await readPostSources(basePath);
        const now = new Date();
        const published = sources.filter(({ data }) => isPublished(data, now));
        // 비공개 전환·삭제·ID 수정 때 이전 캐시가 남지 않게 전체를 교체한다.
        context.store.clear();
        if (!published.length) return;
        const loader = glob({
          base,
          // 정확히 검증한 파일만 읽는다. 제목의 ?·괄호·대괄호도 문자로 처리한다.
          pattern: published.map(({ filePath }) => escapePath(filePath.split(sep).join('/'))),
          generateId: ({ data }) => String(data.nanoId),
          // MD·MDX 렌더링은 실제 글 라우트에서 수행한다.
          deferRender: true,
        });
        await loader.load({ ...context, watcher: undefined });
        context.logger.info(`글 ${sources.length}개 검증, 공개 ${published.length}개 반영`);
      }
      await sync();
      if (!context.watcher) return;
      context.watcher.add(basePath);
      let pending = Promise.resolve();
      const reload = (file: string) => {
        const path = relative(basePath, file);
        if (isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`) || !/\.(md|mdx)$/.test(path)) return;
        pending = pending.then(sync).catch((error) => {
          // 개발 중 검증 오류가 나도 이전 공개 데이터가 계속 노출되지 않도록 한다.
          context.store.clear();
          context.logger.error(error instanceof Error ? error.message : String(error));
        });
      };
      context.watcher.on('add', reload);
      context.watcher.on('change', reload);
      context.watcher.on('unlink', reload);
    },
  };
}
