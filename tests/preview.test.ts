import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
const script=fileURLToPath(new URL('../scripts/preview.ts',import.meta.url));

test('재빌드·실패 중에는 정상 페이지를 유지하고 완성된 결과만 갱신한다',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fredko-preview-'));
 const dist=join(root,'dist');
 await mkdir(join(dist,'post'),{recursive:true});await mkdir(join(dist,'_astro'));
 await writeFile(join(dist,'index.html'),'기존 홈');await writeFile(join(dist,'404.html'),'없는 페이지');
 await writeFile(join(dist,'post/index.html'),'기존 글');await writeFile(join(dist,'_astro/old.css'),'기존 스타일');
 await writeFile(join(dist,'.build-ready'),'first');
 const child=spawn(process.execPath,[script],{cwd:root,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 const ended=once(child,'exit');
 try{
  const url=await new Promise<string>((resolve,reject)=>{
   const deadline=setTimeout(()=>reject(new Error('미리보기 시작 시간 초과')),5000);
   child.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+\//.exec(String(data));if(match){clearTimeout(deadline);resolve(match[0]);}});
   child.once('error',reject);
  });
  const get=(path='')=>fetch(new URL(path,url));
  assert.equal(await (await get('post/')).text(),'기존 글');
  const redirect=await fetch(new URL('post',url),{redirect:'manual'});assert.equal(redirect.status,308);
  // Astro가 dist를 지우고 새 파일을 만드는 동안에도 기존 글과 자산이 살아 있어야 한다.
  await rm(dist,{recursive:true});await mkdir(dist);
  await writeFile(join(dist,'index.html'),'아직 미완성');
  await delay(300);
  assert.equal(await (await get()).text(),'기존 홈');
  assert.equal(await (await get('post/')).text(),'기존 글');
  assert.equal(await (await get('_astro/old.css')).text(),'기존 스타일');
  // 잘못된 완료 신호가 와도 불완전한 결과로 바꾸지 않는다.
  await writeFile(join(dist,'.build-ready'),'broken');await delay(350);
  assert.equal(await (await get('post/')).text(),'기존 글');
  await writeFile(join(dist,'404.html'),'새 없는 페이지');await mkdir(join(dist,'post'));
  await writeFile(join(dist,'index.html'),'새 홈');await writeFile(join(dist,'post/index.html'),'새 글');
  await writeFile(join(dist,'.build-ready'),'second');
  const deadline=Date.now()+5000;
  while(await (await get()).text()!=='새 홈'){assert.ok(Date.now()<deadline,'완성된 결과 갱신');await delay(50);}
  assert.equal(await (await get('post/')).text(),'새 글');
  assert.equal(await (await get('_astro/old.css')).text(),'기존 스타일');
  assert.equal((await get('missing/')).status,404);
 }finally{child.kill();await ended;await rm(root,{recursive:true,force:true});}
});
