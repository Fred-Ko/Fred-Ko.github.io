/** 기존 Obsidian/Jekyll 내보내기 입력을 Astro 원고와 공개 자산에 연결한다. */
import {readFile,writeFile,mkdir,glob,cp,rm,access,lstat} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parse,stringify} from 'yaml';
import {markdownToMdast} from 'satteri';
import {parsePostSource,assertUniquePosts} from '../src/lib/posts/sources.ts';
import baseline from '../src/data/export-baseline.json' with {type:'json'};
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
interface Entry{source:string;target:string;sourceSha256:string;targetSha256:string;nanoId:string}
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
async function exists(path:string){try{await access(path);return true;}catch{return false;}}
export function exportedBody(body:string):string{
 const edits:{start:number;end:number;value:string}[]=[];
 const visit=(node:any)=>{
  if(node.type==='image'){
   const start=node.position?.start.offset,end=node.position?.end.offset;
   if(start===undefined||end===undefined)throw Error('내보낸 이미지 위치를 확인할 수 없습니다.');
   const url=node.url.startsWith('assets/img/')?'/'+node.url:node.url;
   const width=/^\{:\s*width="(\d+)px"\}/.exec(body.slice(end));
   edits.push({start,end:end+(width?.[0].length??0),value:`<img src="${escape(url)}" alt="${escape(node.alt??'')}"${width?` width="${width[1]}"`:''} loading="lazy" decoding="async"${node.title?` title="${escape(node.title)}"`:''}>`});
  }
  for(const child of node.children??[])visit(child);
 };
 visit(markdownToMdast(body));
 for(const edit of edits.sort((a,b)=>b.start-a.start))body=body.slice(0,edit.start)+edit.value+body.slice(edit.end);
 return body;
}
export async function prepareContent(root=process.cwd()){
 const statePath=join(root,'.astro/export-state.json');
 const state:Record<string,Entry>={};
 for(const item of baseline)state[item.nanoId]=item;
 if(await exists(statePath))Object.assign(state,JSON.parse(await readFile(statePath,'utf8')));
 const current=new Set<string>(),validated=[];
 const pending:{path:string;content?:string}[]=[];
 let added=0,updated=0,removed=0;
 for await(const source of glob('블로그/**/_posts/*.md',{cwd:root})){
  const parts=source.split(/[\\/]/);
  if(parts.some(p=>p.startsWith('.'))||await hasSymlink(root,source))continue;
  const original=await readFile(join(root,source),'utf8');
  const post=parsePostSource(original,source);validated.push(post);
  const id=post.data.nanoId;current.add(id);
  const previous=state[id];
  const target=`src/content/posts/${id}.md`;
  const targetPath=join(root,target);
  const existing=await exists(targetPath)?await readFile(targetPath,'utf8'):undefined;
  const mdxPath=join(root,`src/content/posts/${id}.mdx`);
  if(await exists(mdxPath))throw Error(`${source}: 같은 nanoId의 Astro MDX 원고가 있습니다. 중복 발행할 수 없습니다.`);
  if(previous&&hash(original)===previous.sourceSha256&&existing!==undefined)continue;
  if(existing!==undefined&&(!previous||hash(existing)!==previous.targetSha256))throw Error(`${source}: 기존 발행 원고와 Astro 원고가 모두 달라 자동으로 덮어쓰지 않습니다. ${target}와 내용을 합쳐 주세요.`);
  const front=/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(original)!;
  const data=parse(front[1]);
  data.categories=data.categories??parts.slice(0,-2);
  const day=parts.at(-1)!.match(/^(\d{4}-\d{2}-\d{2})-/)?.[1];
  if(day)data.published_at=`${day}T00:00:00+09:00`;
  data.source_path=source;
  const content=`---\n${stringify(data)}---\n${exportedBody(original.slice(front[0].length))}`;
  parsePostSource(content,target);
  pending.push({path:targetPath,content});
  state[id]={source,target,nanoId:id,sourceSha256:hash(original),targetSha256:hash(content)};
  if(existing===undefined)added++;else updated++;
 }
 assertUniquePosts(validated);
 // 기존 방식으로 삭제된 글은 자동 생성본만 제거한다. 직접 수정한 원고는 보존하고 충돌을 알린다.
 if(await exists(join(root,'블로그'))){
  for(const [id,entry] of Object.entries(state)){
   if(current.has(id))continue;
   const path=join(root,entry.target);
   if(await exists(path)){
    if(hash(await readFile(path,'utf8'))!==entry.targetSha256)throw Error(`${entry.target}: 기존 발행 원고는 삭제됐지만 Astro에서 수정되어 자동 삭제하지 않습니다.`);
    pending.push({path});removed++;
   }
   delete state[id];
  }
 }
 for(const edit of pending){if(edit.content===undefined)await rm(edit.path);else{await mkdir(resolve(edit.path,'..'),{recursive:true});await writeFile(edit.path,edit.content);}}
 // 원래 assets/img를 입력으로 유지하고 공개 URL /assets/img는 그대로 제공한다.
 const images=join(root,'assets/img');
 if(await exists(images)){
  await cp(images,join(root,'public/assets/img'),{recursive:true,dereference:false,filter:async path=>!(await lstat(path)).isSymbolicLink()});
 }
 await mkdir(join(root,'.astro'),{recursive:true});
 await writeFile(statePath,JSON.stringify(state,null,2)+'\n');
 return {added,updated,removed};
}
async function hasSymlink(root:string,file:string){
 let path=root;
 for(const part of relative(root,join(root,file)).split(/[\\/]/)){path=join(path,part);if((await lstat(path)).isSymbolicLink())return true;}
 return false;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await prepareContent();console.log(`기존 발행 입력 연결: 새 글 ${result.added}, 수정 ${result.updated}, 삭제 ${result.removed}, assets/img → /assets/img/`);
}
