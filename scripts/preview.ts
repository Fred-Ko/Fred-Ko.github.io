/** 빌드 결과와 로컬 Worker API를 같은 출처로 제공하는 프로젝트 미리보기 서버. */
import {createServer,request as httpRequest} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const port=Number(process.env.PORT??4400);
const base=resolve('dist');
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.wasm':'application/wasm'};
// 빌드가 dist를 비워도 마지막으로 완성된 사이트를 계속 제공한다.
async function loadSnapshot(){
 const files=new Map<string,Buffer>();
 async function walk(directory:string){
  for(const entry of await readdir(directory,{withFileTypes:true})){
   const path=resolve(directory,entry.name);
   if(entry.isDirectory())await walk(path);
   else if(entry.isFile())files.set(path,await readFile(path));
  }
 }
 await walk(base);
 if(!files.has(resolve(base,'index.html'))||!files.has(resolve(base,'404.html')))throw new Error('빌드 결과가 완성되지 않았습니다. 먼저 npm run build를 실행하세요.');
 return files;
}
const marker=resolve(base,'.build-ready');
let snapshot=await loadSnapshot();
let previous=new Map<string,Buffer>();
let version=snapshot.get(marker)?.toString().trim()??'';
let refreshing=false;
const refresh=setInterval(async()=>{
 if(refreshing)return;
 refreshing=true;
 try{
  const nextVersion=(await readFile(marker,'utf8')).trim();
  if(nextVersion!==version){
   const next=await loadSnapshot();
   if(next.get(marker)?.toString().trim()!==nextVersion)return;
   previous=snapshot;snapshot=next;version=nextVersion;
  }
 }catch{/* 빌드 중이거나 실패하면 마지막 정상 결과를 유지한다. */}
 finally{refreshing=false;}
},250);
refresh.unref();
const server=createServer(async(req,res)=>{
 const url=new URL(req.url??'/','http://localhost');
 if(url.pathname.startsWith('/api/')){
  const target=new URL(url.pathname+url.search,process.env.API_PROXY??'http://127.0.0.1:8788');
  const proxy=httpRequest(target,{method:req.method,headers:{...req.headers,host:target.host}},reply=>{res.writeHead(reply.statusCode??502,reply.headers);reply.pipe(res);});
  proxy.setTimeout(6000,()=>proxy.destroy(new Error('로컬 API 응답 시간 초과')));
  proxy.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'로컬 API 서버에 연결할 수 없습니다.'}));});
  req.pipe(proxy);return;
 }
 try{
  const decoded=decodeURIComponent(url.pathname);
  let path=resolve(base,'.'+decoded);
  if(path!==base&&!path.startsWith(base+sep)){res.writeHead(403);res.end();return;}
  if(snapshot.has(resolve(path,'index.html'))){if(!url.pathname.endsWith('/')){res.writeHead(308,{location:url.pathname+'/'+url.search});res.end();return;}path=resolve(path,'index.html');}
  let content:Buffer;
  let code=200;
  const cached=snapshot.get(path)??(decoded.startsWith('/_astro/')?previous.get(path):undefined);
  if(cached)content=cached;else{path=resolve(base,'404.html');content=snapshot.get(path)!;code=404;}
  res.writeHead(code,{'content-type':types[extname(path)]??'application/octet-stream','cache-control':'no-cache'});
  res.end(req.method==='HEAD'?undefined:content);
 }catch{res.writeHead(500);res.end('미리보기를 제공하지 못했습니다.');}
});
server.listen(port,'127.0.0.1',()=>{const address=server.address();console.log(`전체 사이트 미리보기: http://127.0.0.1:${typeof address==='object'&&address?address.port:port}/`);});
