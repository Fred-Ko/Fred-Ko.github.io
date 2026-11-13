import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {fileURLToPath} from 'node:url';
import {readPostSources} from '../../src/lib/posts/sources.ts';
import {isPublished} from '../../src/lib/posts/schema.ts';
import {legacyPosts} from '../../src/lib/posts/legacy.ts';
const posts=(await readPostSources(fileURLToPath(new URL('../../src/content/posts/',import.meta.url)))).filter(p=>isPublished(p.data));
const date=(id:string)=>legacyPosts[id]?.publishedAt??posts.find(p=>p.data.nanoId===id)!.data.datetime.toISOString();
const ordered=[...posts].sort((a,b)=>Date.parse(date(b.data.nanoId))-Date.parse(date(a.data.nanoId))||(legacyPosts[a.data.nanoId]?.order??Number.MAX_SAFE_INTEGER)-(legacyPosts[b.data.nanoId]?.order??Number.MAX_SAFE_INTEGER)||a.data.nanoId.localeCompare(b.data.nanoId));
const pageSize=20;
const saga='/jUbARn1TyHjM47AzUKWO4EZeQ/';
test.beforeEach(async({page})=>{
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  const body=path.endsWith('/stats')||path.endsWith('/view')?{views:10,visitors:5,likes:2,comments:0,liked:false}:path.endsWith('/session')?{user:null}:{comments:[],next_cursor:null};
  return route.fulfill({json:body});
 });
});
test('목록·페이지네이션·분류·보관함·소개를 탐색한다',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('.writing-list>li')).toHaveCount(Math.min(pageSize,posts.length));
 await page.getByRole('navigation',{name:'페이지',exact:true}).getByRole('link',{name:'2',exact:true}).click();
 await expect(page).toHaveURL(/\/page2\/$/);await expect(page.locator('.writing-list>li')).toHaveCount(Math.min(pageSize,posts.length-pageSize));
 await page.goto('/page2/');await expect(page.locator('.writing-list>li')).toHaveCount(Math.min(pageSize,posts.length-pageSize));
 await page.goto('/categories/');await page.getByRole('main').getByRole('link',{name:/Graphql/}).click();
 await expect(page.locator('.taxonomy-posts>li')).toHaveCount(posts.filter(p=>p.data.categories.includes('Graphql')).length);
 await page.goto('/tags/');await page.getByRole('main').getByRole('link',{name:/^graphql /}).click();
 await expect(page.locator('h1')).toContainText('graphql');
 await page.goto('/archives/');await expect(page.locator('.archive-list>li')).toHaveCount(posts.length);
 await page.goto('/about/');await expect(page.locator('h1')).toContainText('About');
 await page.getByRole('main').getByRole('link',{name:/Write Forwarding/}).click();await expect(page.locator('article h1')).toContainText('Write Forwarding');
 expect(errors).toEqual([]);
});
test('검색 결과에서 실제 글로 이동한다',async({page})=>{
 await page.goto('/');await page.locator('[data-search-open]').first().click();
 await page.getByRole('searchbox').fill('Long-Lived');
 await page.locator('.results .r-title').filter({hasText:'Long-Lived Transactions'}).first().click();
 await expect(page).toHaveURL(new RegExp(saga));await expect(page.locator('article h1')).toContainText('Saga');
});
test('테마를 저장하고 페이지를 이동해도 유지한다',async({page})=>{
 await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.getByRole('radio',{name:'다크',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.locator('.writing-list a').first().click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.getByRole('radio',{name:'라이트',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.getByRole('radio',{name:'시스템 설정',exact:true}).click();await expect(page.locator('html')).not.toHaveAttribute('data-theme');
});
test('좁은 화면에서 메뉴와 이미지·표·목차를 확인한다',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});
 for(const path of ['/',saga,'/HmVhyrhAOJoChFINt2TXf1Gwh/','/vhIHDEqcHAMQz1kQnub9xjd3f/','/categories/opentelemetry/','/tags/zero-code-instrumentation/','/archives/','/about/','/404.html']){
  await page.goto(path);await page.evaluate(()=>document.fonts.ready);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  expect(overflow,path).toBe(false);
 }
 await page.goto('/');await page.screenshot({path:info.outputPath('home-mobile.png')});
 await page.goto(saga);await expect(page.locator('.prose img')).toBeVisible();
 await page.screenshot({path:info.outputPath('post-mobile.png')});
 await page.locator('.mobile-menu summary').click();await expect(page.getByRole('navigation',{name:'모바일 메뉴'})).toBeVisible();
 await page.screenshot({path:info.outputPath('mobile.png'),fullPage:true});
});
test('긴 코드는 원래대로 펼쳐 두고 복사를 확인한다',async({page,context,browserName})=>{
 if(browserName==='chromium')await context.grantPermissions(['clipboard-read','clipboard-write']);
 await page.goto('/vhIHDEqcHAMQz1kQnub9xjd3f/');
 await expect(page.locator('.code-expand')).toHaveCount(0);await expect(page.locator('.code-block[data-collapsed]')).toHaveCount(0);
 const copy=page.locator('.code-copy').first();await expect(copy).toBeVisible();await copy.click();await expect(copy).toHaveText('Copied!');
});
test('로그인·댓글 작성·수정·삭제·로그아웃 UI를 확인한다',async({page})=>{
 let loggedIn=true;
 const user={id:'test-user',display_name:'검증 사용자',login:'review',role:'user',profile_url:'https://github.com/review'};
 let comments:any[]=[];
 await page.unroute('**/api/**');
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,method=req.method();
  let body:any={};
  if(path.endsWith('/session'))body={user:loggedIn?user:null};
  else if(path.endsWith('/logout')){loggedIn=false;body={ok:true};}
  else if(path.includes('/posts/')&&path.endsWith('/comments')){
   if(method==='POST'){const data=req.postDataJSON();comments.unshift({id:String(comments.length+1),parent_id:data.parent_id,content_markdown:data.content,content_html:`<p>${data.content}</p>`,created_at:new Date().toISOString(),author:user});body={status:'published'};}
   else body={comments,next_cursor:null};
  }else if(path.includes('/comments/')){
   const id=path.split('/').at(-1);if(method==='DELETE')comments=comments.filter(c=>c.id!==id);else{const data=req.postDataJSON();comments=comments.map(c=>c.id===id?{...c,content_markdown:data.content,content_html:`<p>${data.content}</p>`}:c);}body={ok:true};
  }else body={views:10,likes:0,comments:comments.length,liked:false};
  await route.fulfill({json:body});
 });
 await page.goto(saga);const form=page.locator('[data-comment-form]');await expect(form).toBeVisible();
 await form.getByRole('textbox').fill('첫 번째 검증 댓글');await form.getByRole('button',{name:'댓글 등록',exact:true}).click();await expect(page.locator('.comment-body')).toContainText('첫 번째 검증 댓글');
 await page.locator('[data-comment-list]').getByRole('button',{name:'수정',exact:true}).click();await form.getByRole('textbox').fill('수정한 검증 댓글');await form.getByRole('button',{name:'수정 저장'}).click();await expect(page.locator('.comment-body')).toContainText('수정한 검증 댓글');
 page.on('dialog',dialog=>dialog.accept());await page.locator('[data-comment-list]').getByRole('button',{name:'삭제',exact:true}).first().click();await expect(page.locator('.comment-body')).toHaveCount(0);
 await page.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.getByRole('link',{name:'GitHub 로그인',exact:true})).toBeVisible();
});
test('실제 로컬 Worker에서 통계·좋아요·조회수 쿠키와 익명 댓글 권한을 확인한다',async({request})=>{
 const health=await request.get('/api/health');expect(health.ok()).toBeTruthy();
 const id=crypto.randomUUID();const base='/api/posts/'+id;
 expect((await (await request.get(base+'/stats')).json()).views).toBe(0);
 expect((await (await request.put(base+'/like')).json()).liked).toBe(true);
 expect((await (await request.delete(base+'/like')).json()).liked).toBe(false);
 expect((await (await request.post(base+'/view')).json()).views).toBe(1);
 expect((await (await request.post(base+'/view')).json()).views).toBe(1);
 expect((await request.post(base+'/comments',{data:{content:'익명 댓글은 차단되어야 합니다.'}})).status()).toBe(401);
});


test('서비스워커 등록과 기존 오프라인 캐시 정리를 확인한다',async({browser})=>{
 const context=await browser.newContext({serviceWorkers:'allow'});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:4410/');
 const scope=await page.evaluate(async()=>{const registration=await navigator.serviceWorker.ready;return registration.scope;});
 expect(scope).toBe('http://127.0.0.1:4410/');
 expect(await page.evaluate(async()=>(await caches.keys()).filter(key=>/^(chirpy|fredko-blog)/i.test(key)))).toEqual([]);
 await context.close();
});


test('주요 페이지에 심각한 접근성 오류가 없다',async({page})=>{
 for(const mode of ['light','dark'] as const){
 await page.addInitScript(mode=>localStorage.setItem('theme',mode),mode);
 for(const path of ['/',saga,'/categories/','/about/']){
  await page.goto(path);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(v=>v.impact==='serious'||v.impact==='critical'),mode+path).toEqual([]);
 }
 }
});
test('문서 간 전환과 미지원 브라우저의 일반 이동을 확인한다',async({page,browserName})=>{
 await page.addInitScript(()=>{window.addEventListener('pagereveal',(event:any)=>document.documentElement.setAttribute('data-page-reveal',event.viewTransition?'transition':'fallback'));});
 await page.goto('/');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.locator('.writing-list a').first().click();
 await expect(page.locator('article h1')).toBeVisible();
 if(browserName==='chromium')await expect(page.locator('html')).toHaveAttribute('data-page-reveal','transition');
});


test('기존 발행일·목록 순서·원래의 긴 제목을 그대로 보존한다',async({page})=>{
 const ids:string[]=[];
 for(const path of Array.from({length:Math.ceil(posts.length/pageSize)},(_,i)=>i?`/page${i+1}/`:'/')){await page.goto(path);ids.push(...await page.locator('.writing-list>li>a').evaluateAll(links=>links.map(link=>new URL((link as HTMLAnchorElement).href).pathname.replaceAll('/',''))));}
 expect(ids).toEqual(ordered.map(p=>p.data.nanoId));
 await page.goto('/');
 await expect(page.locator('.writing-list h3').first()).toHaveText(ordered[0].data.title);
 await expect(page.locator('.writing-list .series-label')).toHaveCount(0);
 await expect(page.getByText('생각을 코드로,')).toHaveCount(0);
 await page.goto('/htkKSIurJ1rBmPfv4ELOMuS5I/');await expect(page.locator('.post-kicker time').first()).toHaveText('2026. 06. 11.');
});
test('데스크톱은 첫 화면에 글 네 개가 보이고 모바일은 목차가 기본 접힌다',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 expect(await page.locator('.writing-list>li').evaluateAll(rows=>rows.filter(row=>row.getBoundingClientRect().bottom<=innerHeight).length)).toBeGreaterThanOrEqual(4);
 await page.setViewportSize({width:390,height:844});await page.goto('/K6lhBZ2uIgfHInDC81yde5OJl/');await page.evaluate(()=>document.fonts.ready);
 expect(await page.locator('.toc-panel').evaluate((el:HTMLDetailsElement)=>el.open)).toBe(false);
 expect(await page.locator('.reading-grid .body').evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(600);
 await page.locator('.toc-panel summary').click();await expect(page.locator('[data-toc]')).toBeVisible();
 await page.locator('.mobile-info summary').click();await expect(page.locator('.mobile-info p').first()).toBeVisible();
});
test('화이트 강조색과 목록 호버는 지정한 그린 색을 사용한다',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});await page.goto('/');await page.getByRole('radio',{name:'라이트',exact:true}).click();
 const sample=async(selector:string,property:string)=>page.locator(selector).first().evaluate((el,property)=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=getComputedStyle(el).getPropertyValue(property);ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);
 },property);
 await expect.poll(()=>sample('.brand span','color')).toEqual([22,101,52]);
 await page.locator('.writing-list a').first().hover();
 await expect.poll(()=>sample('.writing-list a','background-color')).toEqual([240,253,244]);
 await expect.poll(()=>sample('.writing-list h3','color')).toEqual([22,101,52]);
});
test('검색 미리보기는 두 줄로 제한하고 제목은 원문 전체를 표시한다',async({page})=>{
 await page.goto('/');await page.locator('[data-search-open]').first().click();await page.getByRole('searchbox').fill('엔트로피');
 const card=page.locator('.results a').filter({has:page.locator('.r-title',{hasText:'엔트로피를 통제하는 방법'})});
 await expect(card).toBeVisible();await expect(card.locator('.r-title')).toHaveText('AI Native 방식으로 서비스 개발하기 - 3부 - 엔트로피를 통제하는 방법');
 const size=await card.locator('.r-excerpt').evaluate(el=>({height:el.getBoundingClientRect().height,line:parseFloat(getComputedStyle(el).lineHeight),clamp:getComputedStyle(el).webkitLineClamp}));
 expect(size.clamp).toBe('2');expect(size.height).toBeLessThanOrEqual(size.line*2+1);
});


test('원본의 문구와 글 하단 구성을 보존하고 임의 탐색을 추가하지 않는다',async({page})=>{
 await page.goto('/');await expect(page.locator('h1')).toHaveText('Latest writing');await expect(page.getByText('Notes from the field',{exact:true})).toBeVisible();
 const nav=page.getByRole('navigation',{name:'주 메뉴',exact:true});
 for(const label of ['Writing','Categories','Tags','Archives','About','GitHub ↗','LinkedIn ↗'])await expect(nav.getByRole('link',{name:label,exact:true})).toBeVisible();
 await expect(page.locator('footer')).toContainText('Some rights reserved.');
 await page.goto('/page2/');await expect(page.locator('.writing-list .index').first()).toHaveText('01');await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://fredko.kr/page2/');
 await page.goto(saga);await expect(page.locator('.post-hero')).toContainText('Written by Fredko');await expect(page.locator('.post-hero')).toContainText('24 min read');
 await expect(page.getByRole('link',{name:'CC BY 4.0',exact:true})).toHaveAttribute('href','https://creativecommons.org/licenses/by/4.0/');
 for(const name of ['Twitter','Facebook','Telegram'])await expect(page.getByRole('link',{name,exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Copy link',exact:true})).toBeVisible();
 await expect(page.locator('.post-hero [data-post-id]')).toHaveCount(0);await expect(page.locator('.series,.post-nav,.reading-progress')).toHaveCount(0);
 expect(await page.locator('.post-tail').evaluate(el=>el.getBoundingClientRect().top)).toBeGreaterThan(await page.locator('.body.prose').evaluate(el=>el.getBoundingClientRect().bottom)-1);
});
test('원본 이미지 확대와 맨 위 이동을 사용할 수 있다',async({page})=>{
 await page.goto(saga);await page.locator('.image-zoom-trigger').first().click();await expect(page.locator('.image-viewer')).toBeVisible();await expect(page.locator('.image-viewer img')).toHaveAttribute('src',/assets\/img\//);
 await page.keyboard.press('Escape');await expect(page.locator('.image-viewer')).not.toBeVisible();
 await page.evaluate(()=>scrollTo(0,1000));const top=page.getByRole('button',{name:'Scroll to Top',exact:true});await expect(top).toBeVisible();await top.click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
});

test('이전 테마 저장값과 통계 숫자의 원래 표기를 유지한다',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('mode','light'));await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.route('**/api/posts/*/stats',route=>route.fulfill({json:{views:12345,likes:2300,comments:100,liked:false}}));
 await page.goto(saga);await expect(page.locator('[data-stat="views"]')).toHaveText('12,345');await expect(page.locator('[data-stat="likes"]')).toHaveText('2,300');
});
