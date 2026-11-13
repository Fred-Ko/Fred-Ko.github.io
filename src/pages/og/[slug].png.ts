import type { APIRoute, GetStaticPaths } from 'astro';
import { renderOg, type OgInput } from '@/lib/og';
import {getPosts} from '../../lib/posts';

/**
 * 정적 OG 이미지. 포스트 컬렉션을 붙이면 여기 getStaticPaths에 포스트별 항목을 추가한다.
 */
const pages: Record<string, OgInput> = {
  default: { title: 'Fredko Dev Log', kicker: 'Fredko Dev Log', description: '백엔드 개발자 Fredko의 기술 블로그.' },
  'design-system': { title: 'Editorial Grid', kicker: 'Fredko / Design System', description: '디자인 토큰과 UI 컴포넌트' },
  sample: { title: 'Long-Lived Transactions의 한계와 Saga', kicker: '설계 / 2026' },
};

export const getStaticPaths = (async () => [
  ...Object.entries(pages).map(([slug,input])=>({params:{slug},props:{input}})),
  ...(await getPosts()).map(post=>({params:{slug:post.id},props:{input:{title:post.data.title,kicker:post.data.categories.filter(c=>c!=='블로그').join(' · '),description:post.data.description}}})),
]) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg(props.input);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png' } });
};
