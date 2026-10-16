import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { pipeline } from 'node:stream';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { Cdp, discoverCodex } from './cdp.mjs';
import generateTheme from './vendor/api/generate-theme_openai.js';
import { enableDirectMedia, fetchDirectResponse, openDirectResponse } from './direct-network.mjs';
import { createAudioCacheHandler } from './audio-cache.mjs';
// Apply only to this component's Node process; leave Codex and Magpie settings alone.
for(const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'])delete process.env[key];
process.env.NO_PROXY='*';process.env.no_proxy='*';process.env.NODE_USE_ENV_PROXY='0';
// The player has its own AI configuration. Do not reuse ambient Codex/provider credentials.
process.env.OPENAI_API_URL=process.env.FOLIA_CODEX_AI_URL||'';
process.env.OPENAI_API_MODEL=process.env.FOLIA_CODEX_AI_MODEL||'';
process.env.OPENAI_API_KEY=process.env.FOLIA_CODEX_AI_KEY||'';
delete process.env.OPENAI_API_TEMPERATURE;
const root=path.dirname(fileURLToPath(import.meta.url));
const instanceId=createHash('sha256').update(root.replaceAll('\\','/').toLowerCase()).digest('hex').slice(0,16);
const dataRoot=process.env.FOLIA_CODEX_DATA_DIR||path.join(os.homedir(),'AppData','Local','CodexFolia');
fs.mkdirSync(dataRoot,{recursive:true});
const stopPath=path.join(dataRoot,'.stop-request');
const enablePath=path.join(dataRoot,'.enable-request');
if(process.argv.includes('--stop')){fs.writeFileSync(stopPath,'stop');process.exit(0);}
if(fs.existsSync(stopPath))fs.unlinkSync(stopPath);
const require=createRequire(import.meta.url);
const {createNeteaseBackend}=require('./vendor/electron/neteaseBackend.cjs');
const backend=createNeteaseBackend({directConnection:true,broadcast(){},logger:{info(){},warn(...args){console.warn(...args)},error(...args){console.error(...args)}}});
const port=Number(process.env.FOLIA_CODEX_PORT||32110);
const cdpPort=Number(process.env.FOLIA_CODEX_CDP_PORT||9338);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.wasm':'application/wasm','.webmanifest':'application/manifest+json'};
const appRoot=path.join(root,'web');
const audioCacheHandler=createAudioCacheHandler(process.env.FOLIA_CODEX_CACHE_DIR||path.join(dataRoot,'Cache'));
const rendererTemplate=fs.readFileSync(path.join(root,'renderer.js'),'utf8').replace('__FOLIA_WIDGETS__',fs.readFileSync(path.join(root,'widgets.js'),'utf8')).replace('__FOLIA_DRAG__',fs.readFileSync(path.join(root,'direct-drag.js'),'utf8')).replace('__FOLIA_LYRIC_LAYOUT__',fs.readFileSync(path.join(root,'lyric-layout.js'),'utf8')).replace('__FOLIA_CSS__',JSON.stringify(fs.readFileSync(path.join(root,'integration.css'),'utf8')));
const renderer=rendererTemplate.replace('__FOLIA_CONFIG__',JSON.stringify({embedded:true}));
const embeddedJs=fs.readFileSync(path.join(root,'embedded/folia.js'),'utf8');
const embeddedCss=fs.readFileSync(path.join(root,'embedded/folia-major.css'),'utf8');
const storageScope=fs.readFileSync(path.join(root,'storage-scope.js'),'utf8');
const networkBridge=fs.readFileSync(path.join(root,'embedded-network.js'),'utf8');
const sessions=new Map();
const server=http.createServer(async(req,res)=>{
  try {
    if(req.headers.host!==`127.0.0.1:${port}` && req.headers.host!==`localhost:${port}`){res.writeHead(403);res.end('Forbidden');return;}
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    if(url.pathname.startsWith('/folia/'))url.pathname=url.pathname.slice('/folia'.length);
    if(await audioCacheHandler(req,res,url))return;
    if(url.pathname==='/integration/audio-stream'){
      const target=new URL(url.searchParams.get('url'));if(!['http:','https:'].includes(target.protocol)){res.writeHead(400);res.end();return}
      const headers={};if(req.headers.range)headers.Range=req.headers.range;
      const upstream=await openDirectResponse(target.href,headers,5,req.method);
      const responseHeaders={...upstream.headers,'access-control-allow-origin':'*'};for(const name of ['transfer-encoding','connection','set-cookie'])delete responseHeaders[name];
      res.writeHead(upstream.statusCode,responseHeaders);res.on('close',()=>{if(!res.writableFinished)upstream.destroy()});pipeline(upstream,res,()=>{});return;
    }
    if(url.pathname==='/storage-scope.js'){
      res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});
      res.end(fs.readFileSync(path.join(root,'storage-scope.js')));return;
    }
    if(url.pathname==='/integration/health'){
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({app:'Folia in Codex',instanceId,backend:backend.getStatus().status,aiConfigured:!!(process.env.OPENAI_API_URL&&process.env.OPENAI_API_MODEL&&process.env.OPENAI_API_KEY),codexConnected:sessions.size>0,network:'direct',directMediaRequests:[...sessions.values()].reduce((n,s)=>n+(s.directMediaRequests||0),0)}));return;
    }
    if(['/api/generate-theme_openai','/api/generate-theme'].includes(url.pathname)){
      if(!(process.env.OPENAI_API_URL&&process.env.OPENAI_API_MODEL&&process.env.OPENAI_API_KEY)){
        res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'AI 主题尚未配置。请从开始菜单打开“配置 AI”，填写自己的接口地址、模型和 API Key，然后关闭并重新打开 Codex Folia。'}));return;
      }
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const result=await generateTheme(new Request('http://127.0.0.1'+url.pathname,{method:req.method,headers:{'Content-Type':'application/json'},body:Buffer.concat(chunks)}));
      res.writeHead(result.status,{'Content-Type':'application/json'});res.end(await result.text());return;
    }
    if(url.pathname.startsWith('/api/netease/')){
      const upstreamPort=backend.getPort();
      if(!upstreamPort){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({code:503,message:'网易云服务正在启动或启动失败，请查看启动日志。'}));return;}
      const headers={...req.headers,host:`127.0.0.1:${upstreamPort}`};delete headers.origin;
      const upstream=http.request({host:'127.0.0.1',port:upstreamPort,path:url.pathname.slice('/api/netease'.length)+url.search,method:req.method,headers},response=>{
        res.writeHead(response.statusCode,response.headers);pipeline(response,res,()=>{});
      });
      upstream.setTimeout(30000,()=>upstream.destroy(new Error('NetEase request timeout')));
      upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({code:502,message:'网易云服务暂时不可用。'}));});
      pipeline(req,upstream,()=>{});return;
    }
    if(url.pathname==='/integration/preview'){
      const previewRenderer=rendererTemplate.replace('__FOLIA_CONFIG__',JSON.stringify({url:`http://127.0.0.1:${port}/folia/?codex=1`}));
      const html=fs.readFileSync(path.join(root,'preview.html'),'utf8').replace('/* INJECT */',previewRenderer);
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;
    }
    if(url.pathname.startsWith('/api/')){
      res.writeHead(501,{'Content-Type':'application/json'});
      res.end(JSON.stringify({code:501,message:'此本地版本已接入网易云；其他可选服务尚未配置。'}));return;
    }
    let file=path.resolve(appRoot,'.'+decodeURIComponent(url.pathname));
    if(file!==appRoot && !file.startsWith(appRoot+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
    if(url.pathname==='/' || !path.extname(file))file=path.join(appRoot,'index.html');
    const stat=await fs.promises.stat(file).catch(()=>null);
    if(!stat?.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    if(path.basename(file)==='index.html'){
      let html=await fs.promises.readFile(file,'utf8');
      if(url.searchParams.get('codex')==='1')html=html.replace(/<script[^>]*src="[^"]*registerSW\.js"[^>]*><\/script>/g,'');
      res.end(html.replace('<head>','<head><script src="/folia/storage-scope.js"></script>'));return;
    }
    pipeline(fs.createReadStream(file),res,()=>{});
  }catch(error){if(!res.headersSent)res.writeHead(500);res.end('Folia integration error');console.error(error.message);}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Folia 服务已经运行或端口被占用。':error.message);process.exit(1);});
server.listen(port,'127.0.0.1',()=>{
  console.log(`Folia web ready: http://127.0.0.1:${port}`);
  void backend.start().then(status=>console.log(`NetEase backend: ${status.status}`));
});
let scanning=false;
async function serveEmbeddedRequest(session,params){
  if(!session.embeddedContexts.has(params.executionContextId))return;
  let request;
  try{
    request=JSON.parse(params.payload);
    if(/^https?:\/\//i.test(request.url)){
      const reply=await fetchDirectResponse(request.url,request);
      await session.send('Runtime.evaluate',{contextId:params.executionContextId,expression:`globalThis.__foliaResolveRpc(${JSON.stringify(request.id)},${JSON.stringify(reply)})`});
      return;
    }
    if(!request.url.startsWith('/folia/')&&!request.url.startsWith('/api/'))throw new Error('不支持的 Folia 接口。');
    const target=new URL(request.url,`http://127.0.0.1:${port}`);
    if(target.origin!==`http://127.0.0.1:${port}`)throw new Error('不支持的 Folia 接口地址。');
    const response=await fetch(target,{
      method:request.method,headers:request.headers,
      body:['GET','HEAD'].includes(request.method)?undefined:request.body,
      signal:AbortSignal.timeout(request.url.includes('generate-theme')?125000:35000),
    });
    const body=Buffer.from(await response.arrayBuffer()).toString('base64');
    const reply={status:response.status,headers:Object.fromEntries(response.headers),body};
    await session.send('Runtime.evaluate',{contextId:params.executionContextId,expression:`globalThis.__foliaResolveRpc(${JSON.stringify(request.id)},${JSON.stringify(reply)})`});
  }catch(error){
    if(request)try{await session.send('Runtime.evaluate',{contextId:params.executionContextId,expression:`globalThis.__foliaResolveRpc(${JSON.stringify(request.id)},${JSON.stringify({error:error.message})})`});}catch{}
  }
}
async function bootEmbedded(session){
  if(backend.getStatus().status!=='running')return;
  if(!await session.evaluate('Boolean(window.__FOLIA_CODEX__?.visualRoot && window.__FOLIA_CODEX__?.subtitleRoot && window.__FOLIA_CODEX__?.panelRoot && window.__FOLIA_CODEX__?.barRoot && window.__FOLIA_CODEX__?.overlayRoot)'))return;
  const result=await session.send('Page.getFrameTree');
  session.directMediaFrames=new Set(result.frameTree.childFrames?.filter(item=>item.frame.name.startsWith('folia-')).map(item=>item.frame.id));
  const frame=result.frameTree.childFrames?.find(item=>item.frame.name==='folia-codex-runtime')?.frame;
  if(!frame)return;
  const context=[...session.contexts.values()].find(item=>item.auxData?.frameId===frame.id&&item.auxData?.isDefault);
  if(!context||session.embeddedContexts.has(context.id))return;
  session.embeddedContexts.add(context.id);
  const css=`(() => {const foliaStyle=document.createElement('style');foliaStyle.textContent=${JSON.stringify(embeddedCss)};document.head.append(foliaStyle);})();`;
  const boot=await session.send('Runtime.evaluate',{contextId:context.id,expression:`window.__FOLIA_RUNTIME_CONFIG__={aiProvider:'openai'};\n${storageScope}\n${networkBridge}\n${css}\n${embeddedJs}\n//# sourceURL=folia-embedded-runtime.js`,awaitPromise:true,returnByValue:true});
  if(boot.exceptionDetails)throw new Error(boot.exceptionDetails.exception?.description||'Folia 启动失败。');
  console.log('Folia original runtime started inside Codex.');
}
async function attachCodex(){
  if(fs.existsSync(stopPath)){fs.unlinkSync(stopPath);await shutdown();return;}
  if(scanning)return;scanning=true;
  try{
    const {targets}=await discoverCodex(cdpPort);const live=new Set();
    const enableRequested=fs.existsSync(enablePath);
    for(const target of targets){
      if(target.type!=='page'||!target.url?.startsWith('app://-/index.html')||/prewarm|window%3Dpage|window=page/.test(target.url)||!target.webSocketDebuggerUrl)continue;
      live.add(target.id);
      let session=sessions.get(target.id);
      if(!session){
        session=new Cdp(target.webSocketDebuggerUrl);await session.ready;
        session.contexts=new Map();session.embeddedContexts=new Set();
        session.ws.addEventListener('message',event=>{
          const message=JSON.parse(event.data);
          if(message.method==='Runtime.executionContextCreated')session.contexts.set(message.params.context.id,message.params.context);
          if(message.method==='Runtime.executionContextDestroyed'){session.contexts.delete(message.params.executionContextId);session.embeddedContexts.delete(message.params.executionContextId);}
          if(message.method==='Runtime.executionContextsCleared'){session.contexts.clear();session.embeddedContexts.clear();}
          if(message.method==='Runtime.bindingCalled'&&message.params.name==='__foliaRpc')void serveEmbeddedRequest(session,message.params);
        });
        await session.send('Runtime.enable');
        await session.send('Runtime.addBinding',{name:'__foliaRpc'});
        await enableDirectMedia(session,`http://127.0.0.1:${port}`);
        sessions.set(target.id,session);session.ws.addEventListener('close',()=>sessions.delete(target.id),{once:true});
      }
      if(enableRequested)await session.evaluate('delete window.__FOLIA_CODEX_DISABLED__');
      const needs=await session.evaluate('Boolean(document.querySelector("aside.app-shell-left-panel, [data-app-shell-main-surface]") && !window.__FOLIA_CODEX__ && !window.__FOLIA_CODEX_DISABLED__)');
      if(needs){await session.evaluate(renderer);console.log('Folia attached to Codex.');}
      if(await session.evaluate('Boolean(window.__FOLIA_CODEX__ && !window.__FOLIA_CODEX__.ready)'))await bootEmbedded(session);
    }
    for(const [id,session]of sessions)if(!live.has(id)){session.close();sessions.delete(id);}
    if(enableRequested&&live.size)fs.unlinkSync(enablePath);
  }catch(error){if(sessions.size)console.warn(error.message);}finally{scanning=false;}
}
const watcher=setInterval(attachCodex,2000);void attachCodex();
async function shutdown(){
  clearInterval(watcher);
  await Promise.allSettled([...sessions.values()].map(async session=>{await session.send('Fetch.disable');await session.evaluate('window.__FOLIA_CODEX__?.destroy()');session.close();}));
  server.close();process.exit(0);
}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
