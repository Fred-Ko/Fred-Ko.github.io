import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareContent,exportedBody} from '../scripts/prepare-content.ts';
const source=(title:string)=>`---\npost_id: 73ace9d4-e5dc-4f32-8e89-a821b5750743\nnanoId: export-test\npermalink: /export-test/\ntitle: ${title}\ndatetime: 2000-01-02T00:00:00Z\n---\n## 본문\n\n![그림](assets/img/a.png){:width="100px"}\n`;
test('기존 발행 경로의 추가·수정·삭제와 이미지 경로를 처리하고 직접 수정 충돌을 막는다',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fredko-exports-'));
 try{
  const legacy=join(root,'블로그/테스트/_posts');await mkdir(legacy,{recursive:true});await mkdir(join(root,'assets/img'),{recursive:true});
  await writeFile(join(root,'assets/img/a.png'),'검증 이미지');
  const path=join(legacy,'2000-01-02-example.md'),target=join(root,'src/content/posts/export-test.md');
  await writeFile(path,source('첫 제목'));assert.equal((await prepareContent(root)).added,1);
  let contents=await readFile(target,'utf8');assert.match(contents,/published_at: 2000-01-02T00:00:00\+09:00/);assert.match(contents,/categories:[\s\S]*블로그[\s\S]*테스트/);assert.match(contents,/<img src="\/assets\/img\/a.png" alt="그림" width="100"/);
  assert.equal(await readFile(join(root,'public/assets/img/a.png'),'utf8'),'검증 이미지');
  assert.equal((await prepareContent(root)).updated,0);
  await writeFile(path,source('둘째 제목'));assert.equal((await prepareContent(root)).updated,1);assert.match(await readFile(target,'utf8'),/둘째 제목/);
  contents=await readFile(target,'utf8');await writeFile(target,contents+'\n직접 수정');await writeFile(path,source('셋째 제목'));await assert.rejects(prepareContent(root),/자동으로 덮어쓰지 않습니다/);
  await writeFile(target,contents);await prepareContent(root);await rm(path);assert.equal((await prepareContent(root)).removed,1);await assert.rejects(readFile(target),{code:'ENOENT'});
 }finally{await rm(root,{recursive:true,force:true});}
});
test('내보내기 변환은 코드 예시를 보존한다',()=>{
 const code='```md\n![예시](assets/img/a.png){:width="100px"}\n```';
 assert.equal(exportedBody(code),code);
 assert.equal(exportedBody('`![예시](assets/img/a.png)`'),'`![예시](assets/img/a.png)`');
});
