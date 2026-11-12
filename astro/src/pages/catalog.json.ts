import type { APIRoute } from 'astro';
import { catalog } from '@/catalog/catalog.mjs';

/** 컴포넌트 카탈로그를 JSON Schema 문서로 배포 — AI 글쓰기 도구에 그대로 넘길 수 있다. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(catalog, null, 2), {
    headers: { 'Content-Type': 'application/schema+json; charset=utf-8' },
  });
