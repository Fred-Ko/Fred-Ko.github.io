import { getCollection, type CollectionEntry } from 'astro:content';
import { execFileSync } from 'node:child_process';
import {legacyPosts} from './legacy';
import { taxonomySlug } from '../site';
export {readingMinutes} from './reading';
export type Post = CollectionEntry<'posts'>;
export function publishedAt(post: Post): Date {
  return new Date(post.data.published_at ?? legacyPosts[post.id]?.publishedAt ?? post.data.datetime);
}
export async function getPosts(): Promise<Post[]> {
  return (await getCollection('posts')).sort((a,b) => publishedAt(b).getTime()-publishedAt(a).getTime()
    || (legacyPosts[a.id]?.order??Number.MAX_SAFE_INTEGER)-(legacyPosts[b.id]?.order??Number.MAX_SAFE_INTEGER)
    || a.id.localeCompare(b.id));
}
export function lastModified(post: Post): Date {
  const source=post.data.source_path ?? legacyPosts[post.id]?.source;
  const dates=[publishedAt(post)];
  for(const path of [source, `src/content/posts/${post.id}.md`].filter(Boolean)) {
    try {
      const history=execFileSync('git',['log','--format=%aI','--',path!],{cwd:process.cwd(),encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split('\n').filter(Boolean);
      // 원고를 새 경로로 옮긴 첫 커밋은 내용 수정일로 세지 않는다.
      if(history.length<2)continue;
      const timestamp=history[0];
      if(timestamp && Number.isFinite(Date.parse(timestamp))) dates.push(new Date(timestamp));
    } catch { /* Git 이력이 없는 배포 패키지는 작성일을 사용한다. */ }
  }
  return new Date(Math.max(...dates.map(d=>d.getTime())));
}
export function taxonomy(posts: Post[], kind: 'tags'|'categories') {
  const groups=new Map<string,{name:string;slug:string;posts:Post[]}>();
  for(const post of posts) for(const name of new Set(post.data[kind])) {
    const slug=taxonomySlug(name);
    const group=groups.get(slug) ?? {name,slug,posts:[]};
    if(group.name!==name) throw new Error(`분류 주소 충돌: ${group.name}, ${name}`);
    group.posts.push(post); groups.set(slug,group);
  }
  return [...groups.values()].sort((a,b)=>{
    // Liquid sort_natural(태그) / sort(카테고리)의 유니코드 순서를 보존한다.
    const left=kind==='tags'?a.name.toLowerCase():a.name;
    const right=kind==='tags'?b.name.toLowerCase():b.name;
    return left<right?-1:left>right?1:0;
  });
}
