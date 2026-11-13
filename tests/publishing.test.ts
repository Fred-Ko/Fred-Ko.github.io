import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,readFile,rm,symlink,mkdir,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {stringify} from 'yaml';
import {readPostSources} from '../src/lib/posts/sources.ts';
import {isPublished} from '../src/lib/posts/schema.ts';
import {checkSite} from '../scripts/check-site.ts';
import {prepareContent} from '../scripts/prepare-content.ts';
const root=fileURLToPath(new URL('../',import.meta.url));

test('새 MDX 글·이미지와 기존 글 수정은 발행 검사를 통과하고 비공개 글은 제외한다',async()=>{
 const dir=await realpath(await mkdtemp(join(tmpdir(),'fredko-publishing-')));
 try{
  for(const name of ['src','public','블로그','assets'])await cp(join(root,name),join(dir,name),{recursive:true});
  for(const name of ['astro.config.mjs','tsconfig.json'])await cp(join(root,name),join(dir,name));
  await symlink(join(root,'node_modules'),join(dir,'node_modules'),'dir');
  await writeFile(join(dir,'package.json'),'{"type":"module"}');
  const sources=await readPostSources(join(dir,'src/content/posts'));
  const expected=sources.filter(p=>isPublished(p.data)).length;
  const existing=sources.find(p=>isPublished(p.data))!;
  const existingPath=join(dir,'src/content/posts',existing.filePath);
  await writeFile(existingPath,(await readFile(existingPath,'utf8'))+'\n\n기존 글 본문을 수정한 발행 검증 문장입니다.\n');
  await mkdir(join(dir,'public/assets/img/publishing-check'),{recursive:true});
  await cp(join(root,'public/assets/img/avatar.jpg'),join(dir,'public/assets/img/publishing-check/image.jpg'));
  const data={title:'새 글 발행 검증',post_id:'af97326b-83f9-4d6c-889d-931f36ac81f8',nanoId:'publishing-check',permalink:'/publishing-check/',datetime:'2000-01-01T00:00:00Z',tags:['publishing-check'],categories:['발행 검증']};
  const markdown=(value:object,body:string)=>`---\n${stringify(value)}---\n${body}\n`;
  await writeFile(join(dir,'src/content/posts/publishing-check.mdx'),markdown(data,'## 새 본문\n\n![검증 이미지](/assets/img/publishing-check/image.jpg)\n\n<p>MDX 발행 검증</p>'));
  await writeFile(join(dir,'src/content/posts/private-check.md'),markdown({...data,post_id:'3d2d4c92-b8ab-4b22-9156-94bc2fc826d2',nanoId:'private-check',permalink:'/private-check/',published:false},'PRIVATE_PUBLISHING_CHECK_SECRET'));
  const exported={...data,title:'기존 발행 도구 새 글',post_id:'73ace9d4-e5dc-4f32-8e89-a821b5750743',nanoId:'export-check',permalink:'/export-check/'};
  await mkdir(join(dir,'블로그/발행 검증/_posts'),{recursive:true});
  await writeFile(join(dir,'블로그/발행 검증/_posts/2000-01-02-export-check.md'),markdown(exported,'## 기존 방식 발행\n\n![초록 곰](assets/img/avatar.jpg){:width="100px"}'));
  await prepareContent(dir);
  execFileSync(process.execPath,[join(root,'node_modules/astro/bin/astro.mjs'),'build','--root',dir],{cwd:dir,stdio:'pipe',timeout:90000});
  execFileSync(join(root,'node_modules/.bin/pagefind'),['--site',join(dir,'dist')],{cwd:dir,stdio:'pipe',timeout:30000});
  const result=await checkSite(dir);
  assert.equal(result.posts,expected+2);
  assert.match(await readFile(join(dir,'dist/publishing-check/index.html'),'utf8'),/MDX 발행 검증/);
  const exportedHtml=await readFile(join(dir,'dist/export-check/index.html'),'utf8');
  assert.match(exportedHtml,/src="\/assets\/img\/avatar.jpg"/);
  assert.match(exportedHtml,/2000\. 01\. 02\./);
  assert.match(await readFile(join(dir,'dist',existing.data.nanoId,'index.html'),'utf8'),/기존 글 본문을 수정한 발행 검증 문장입니다\./);
  await assert.rejects(readFile(join(dir,'dist/private-check/index.html')),{code:'ENOENT'});
  // 링크 검사가 제거되거나 글 수만 통과시키는 검사가 되지 않도록 누락 자산도 확인한다.
  await rm(join(dir,'dist/assets/img/publishing-check/image.jpg'));
  await assert.rejects(checkSite(dir),/내부 링크 누락.*publishing-check\/image\.jpg/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
