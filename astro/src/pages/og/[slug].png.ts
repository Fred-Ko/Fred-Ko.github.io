import type { APIRoute, GetStaticPaths } from 'astro';
import { renderOg, type OgInput } from '@/lib/og';

/**
 * 정적 OG 이미지. 포스트 컬렉션을 붙이면 여기 getStaticPaths에 포스트별 항목을 추가한다.
 */
const pages: Record<string, OgInput> = {
  default: { title: 'Fredko Dev Log', kicker: 'Backend · Architecture', description: '백엔드 개발자 Fredko의 기술 블로그.' },
  'design-system': { title: 'Editorial Grid', kicker: 'Fredko / Design System', description: '디자인 토큰과 UI 컴포넌트' },
  sample: { title: 'Long-Lived Transactions의 한계와 Saga', kicker: '설계 / 2026' },
};

export const getStaticPaths = (() => Object.keys(pages).map((slug) => ({ params: { slug } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const png = await renderOg(pages[params.slug as string]);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png' } });
};
