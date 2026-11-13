import { z } from 'astro/zod';

const nonempty = z.string().trim().min(1, '빈 문자열은 사용할 수 없습니다.');

export const postSchema = z.object({
  post_id: z.uuid('post_id는 UUID 형식이어야 합니다.').transform((id) => id.toLowerCase()),
  title: nonempty,
  description: z.string().trim().default(''),
  datetime: z.union([
    z.date(),
    z.iso.datetime({ offset: true, error: 'datetime은 시간대가 포함된 ISO 날짜여야 합니다.' })
      .transform((value) => new Date(value)),
  ]),
  nanoId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/, 'nanoId는 영문·숫자·밑줄·하이픈만 허용합니다.'),
  permalink: nonempty,
  published_at: z.union([z.date().transform(value=>value.toISOString()),z.iso.datetime({offset:true})]).optional(),
  source_path: z.string().optional(),
  tags: z.array(nonempty).default([]),
  categories: z.array(nonempty).default([]),
  published: z.boolean().default(true),
  draft: z.boolean().default(false),
}).superRefine((post, ctx) => {
  if (post.permalink !== `/${post.nanoId}/`) {
    ctx.addIssue({ code: 'custom', path: ['permalink'], message: 'permalink는 /<nanoId>/와 정확히 같아야 합니다.' });
  }
});

export type PostData = z.infer<typeof postSchema>;

export function isPublished(post: PostData, now = new Date()): boolean {
  return post.published && !post.draft && post.datetime.getTime() <= now.getTime();
}
