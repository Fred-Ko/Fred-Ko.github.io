import {readFile,access,readdir} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPostSources} from '../src/lib/posts/sources.ts';
import {isPublished} from '../src/lib/posts/schema.ts';

/** 현재 원고를 기준으로 검사한다. 이전 당시의 글 수·내용은 일반 발행 조건이 아니다. */
export async function checkSite(root=process.cwd()) {
 const dist=join(root,'dist');
 const failures:string[]=[];
 const assert=(condition:unknown,message:string)=>{if(!condition)failures.push(message);};
 async function exists(path:string){try{await access(path);return true;}catch{return false;}}
 const localPath=(pathname:string)=>join(dist,decodeURIComponent(pathname),pathname.endsWith('/')?'index.html':'');
 for(const path of ['/feed.xml','/sitemap.xml','/robots.txt','/sw.min.js','/CNAME','/.nojekyll','/pagefind/pagefind.js','/favicons/site.webmanifest'])assert(await exists(localPath(path)),`필수 파일 누락: ${path}`);
 const htmlFiles:string[]=[];
 async function walk(dir:string){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else if(path.endsWith('.html'))htmlFiles.push(path);}}
 await walk(dist);
 for(const file of htmlFiles){
  const html=await readFile(file,'utf8');
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
   const href=match[1].replaceAll('&amp;','&');
   if(/^(?:https?:|mailto:|data:|tel:|javascript:|\/\/)/.test(href)||href.startsWith('/api/'))continue;
   if(href.startsWith('#')){assert(ids.has(decodeURIComponent(href.slice(1))),`${relative(dist,file)}: 문서 앵커 누락 ${href}`);continue;}
   const url=new URL(href,'https://fredko.kr/'+relative(dist,file));
   let target=localPath(url.pathname);
   if(!url.pathname.endsWith('/')&&!/\.[a-z0-9]+$/i.test(url.pathname))target=join(target,'index.html');
   assert(await exists(target),`${relative(dist,file)}: 내부 링크 누락 ${href}`);
  }
 }
 const sources=await readPostSources(join(root,'src/content/posts'));
 const now=new Date();
 const posts=sources.filter(post=>isPublished(post.data,now));
 for(const {filePath,data:post} of sources){
  const path=localPath(post.permalink);
  if(!isPublished(post,now)){
   assert(!await exists(path),`${filePath}: 비공개·초안·미래 글이 공개됨`);
   continue;
  }
  if(!await exists(path)){assert(false,`${filePath}: 공개 글 페이지 누락`);continue;}
  const html=await readFile(path,'utf8');
  assert(html.includes(`data-post-id="${post.post_id}"`),`${filePath}: 통계 ID 불일치`);
  assert(html.includes('data-comments'),`${filePath}: 댓글 영역 누락`);
  assert(html.includes(`/og/${post.nanoId}.png`),`${filePath}: OG 연결 누락`);
  const pngPath=join(dist,'og',post.nanoId+'.png');
  if(!await exists(pngPath)){assert(false,`${filePath}: OG 이미지 누락`);continue;}
  const png=await readFile(pngPath);
  assert(png.readUInt32BE(16)===1200&&png.readUInt32BE(20)===630,`${filePath}: OG 크기 오류`);
 }
 if(failures.length)throw new Error([...new Set(failures)].join('\n'));
 return {html:htmlFiles.length,posts:posts.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await checkSite();console.log(`검증 통과: HTML ${result.html}개 내부 링크·자산, 공개 글 ${result.posts}개 ID·OG·댓글, 비공개 제외, 검색·RSS·사이트맵`);}
 catch(error){console.error(error instanceof Error?error.message:error);process.exitCode=1;}
}
