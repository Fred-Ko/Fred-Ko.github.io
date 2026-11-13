export const site = {
  title: 'Fredko Dev Log',
  description: '백엔드 개발자 Fredko의 기술 블로그.',
  url: 'https://fredko.kr',
  author: 'Fredko',
  email: 'fredko328@gmail.com',
  github: 'https://github.com/fred-ko',
  linkedin: 'https://www.linkedin.com/in/junho-ko-30b2a3287/',
  googleAnalytics: 'G-RTQVB2TJ8M',
  pageSize: 20,
  apiBase: '/api',
  viewDelay: 8000,
};
export const taxonomySlug = (name: string) => name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '');
export const pageHref = (page: number) => page === 1 ? '/' : `/page${page}/`;
export const absolute = (path: string) => new URL(path, site.url).href;
export const xml = (text: string) => text.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
