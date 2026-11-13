import {readFile,access} from 'node:fs/promises';
import legacyUrls from '../../docs/migration/legacy-urls.json' with {type:'json'};
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import baseline from '../../docs/migration/legacy-ui-baseline.json' with {type:'json'};
import reading from '../../docs/migration/legacy-reading-times.json' with {type:'json'};
const read=(path:string)=>readFile(`dist/${path}`,'utf8');
for(const url of legacyUrls)await access(`dist${decodeURIComponent(url)}${url.endsWith('/')?'index.html':''}`);
const decode=(s:string)=>s.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&#39;',"'").replaceAll('&quot;','"').replace(/\s+/g,' ').trim();
for(const post of baseline.posts){
 const html=await read(`${post.id}/index.html`);
 const hero=html.match(/<header class="post-hero"[^>]*>([\s\S]*?)<\/header>/)![1];
 assert.equal(decode(hero.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)![1]),post.title,post.id+': 제목');
 const dates=[...hero.matchAll(/<time datetime="([^"]+)"/g)].map(m=>Date.parse(m[1]));
 assert.equal(dates[0],Date.parse(post.published),post.id+': 발행일');
 if(post.updated!==null)assert.equal(dates[1],post.updated*1000,post.id+': 수정일');
 else assert.equal(dates.length,1,post.id+': 임의 수정일');
 assert.ok(hero.includes(`${post.minutes} min read`),post.id+': 읽기 시간');
 assert.ok(hero.includes('Written by')&&hero.includes('Fredko'),post.id+': 작성자');
 assert.ok(!hero.includes('data-post-id'),post.id+': 상단 통계 추가');
 assert.ok(html.includes('CC BY 4.0')&&html.includes('data-copy-link='),post.id+': 하단 라이선스·공유');
 assert.ok(!/class="(?:series|post-nav|reading-progress)\b/.test(html),post.id+': 임의 탐색 추가');
 const source=await readFile(`src/content/posts/${post.id}.md`,'utf8');
 const body=source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/,'').replaceAll('\r\n','\n').trim();
 assert.equal(createHash('sha256').update(body).digest('hex'),reading[post.id as keyof typeof reading].bodySha256,post.id+': 읽기 시간 기준 원문');
}
const home=await read('index.html');
for(const value of ['Latest writing','Notes from the field','28 articles','Writing','Categories','Tags','Archives','About','GitHub ↗','LinkedIn ↗','Some rights reserved.'])assert.ok(home.includes(value),'기존 문구: '+value);
for(const value of ['생각을 코드로','경험을 기록으로','최근 글','series-label'])assert.ok(!home.includes(value),'임의 문구: '+value);
for(const kind of ['tags','categories'] as const){
 const html=await read(`${kind}/index.html`);
 const links=[...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].filter(m=>m[1].startsWith(`/${kind}/`)&&m[1]!==`/${kind}/`).map(m=>[decodeURIComponent(m[1]),decode(m[2].replace(/<[^>]+>/g,'')).replace(/\s/g,'')]);
 assert.deepEqual(links,baseline.taxonomy[kind],kind+': 표시 순서');
}
assert.equal((await read('feed.xml')).match(/<entry>/g)?.length,5,'RSS 글 개수');
const page2=await read('page2/index.html');assert.ok(page2.includes('href="https://fredko.kr/page2/"'),'페이지 주소');
assert.equal(page2.match(/class="index"[^>]*>(\d+)/)?.[1],'01','페이지별 번호');
assert.ok((await read('categories/index.html')).includes('data-category-toggle'),'카테고리 계층·기본 펼침');
assert.equal((await read('archives/index.html')).match(/<time datetime=/g)?.length,28,'보관함 날짜 목록');
for(const path of ['favicons/site.webmanifest','assets/img/favicons/site.webmanifest']){
 const manifest=JSON.parse(await read(path));
 assert.equal(manifest.display,'fullscreen');assert.equal(manifest.start_url,'/index.html');assert.equal(manifest.short_name,'Fredko Dev Log');assert.equal(manifest.theme_color,'#2a1e6b');assert.equal(manifest.background_color,'#ffffff');
}
console.log(`원본 대조 통과: 기존 URL ${legacyUrls.length}개, 글 28개 제목·발행일·수정일·읽기 시간·작성자·하단 기능, 공통 문구·카테고리·보관함·RSS·페이지 주소·PWA`);
