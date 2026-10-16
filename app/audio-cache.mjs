import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { requestDirect } from './direct-network.mjs';

export const AUDIO_CACHE_LIMIT_BYTES=15*1024*1024*1024;

// audio-cache.mjs: component-owned audio files, independent of Codex's profile and updates.
export class DiskAudioCache {
  constructor(directory){this.directory=path.resolve(directory)}
  paths(key){if(typeof key!=='string'||!key.startsWith('audio_'))throw new Error('Invalid audio cache key');const name=createHash('sha256').update(key).digest('hex');return {audio:path.join(this.directory,name+'.audio'),meta:path.join(this.directory,name+'.json')}}
  async entries(){await fs.mkdir(this.directory,{recursive:true});const names=(await fs.readdir(this.directory)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));const entries=await Promise.all(names.map(async name=>{try{const meta=JSON.parse(await fs.readFile(path.join(this.directory,name),'utf8')),audio=path.join(this.directory,name.replace('.json','.audio')),stat=await fs.stat(audio);return {...meta,audio,meta:path.join(this.directory,name),size:stat.size,touched:stat.mtimeMs}}catch{return null}}));return entries.filter(Boolean)}
  async stats(){const entries=await this.entries();return {directory:this.directory,size:entries.reduce((n,e)=>n+e.size,0),count:entries.length}}
  async has(key){const {audio}=this.paths(key);return !!await fs.stat(audio).catch(()=>null)}
  async read(key){const files=this.paths(key);try{const [data,meta]=await Promise.all([fs.readFile(files.audio),fs.readFile(files.meta,'utf8')]);await fs.utimes(files.audio,new Date(),new Date());return {data,mime:JSON.parse(meta).mime||'audio/mpeg'}}catch(error){if(error.code==='ENOENT')return null;throw error}}
  async write(key,data,mime,limitBytes=AUDIO_CACHE_LIMIT_BYTES){
    const files=this.paths(key);await fs.mkdir(this.directory,{recursive:true});
    const temp=files.audio+'.'+randomUUID()+'.tmp';await fs.writeFile(temp,data);await fs.rename(temp,files.audio);await fs.writeFile(files.meta,JSON.stringify({key,mime}));
    if(limitBytes>0){const entries=(await this.entries()).sort((a,b)=>a.touched-b.touched);let total=entries.reduce((n,e)=>n+e.size,0);for(const e of entries){if(total<=limitBytes)break;await fs.unlink(e.audio);await fs.unlink(e.meta);total-=e.size}}
  }
  async clear(){for(const e of await this.entries()){await fs.unlink(e.audio);await fs.unlink(e.meta)}}
}

export function createAudioCacheHandler(directory){
  const cache=new DiskAudioCache(directory);
  const downloads=new Map();let downloadQueue=Promise.resolve();
  return async(req,res,url)=>{
    if(!url.pathname.startsWith('/api/audio-cache'))return false;
    if(req.headers.origin&&!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(req.headers.origin)){res.writeHead(403);res.end();return true}
    const key=url.searchParams.get('key');
    if(req.method==='POST'&&url.pathname.endsWith('/download')){
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));cache.paths(body.key);
      if(!/^https?:\/\//i.test(body.url))throw new Error('Invalid audio source');
      if(!downloads.has(body.key)){
        const task=downloadQueue.catch(()=>{}).then(async()=>{
          if(!body.force&&await cache.has(body.key))return;
          const result=await requestDirect(body.url),headers={};for(let i=0;i<result.headers.length;i+=2)headers[result.headers[i].toLowerCase()]=result.headers[i+1];
          const mime=headers['content-type']||'audio/mpeg';
          if(result.status!==200||result.body.length<1024||/json|text\/|html/i.test(mime))throw new Error('Download is not complete audio');
          await cache.write(body.key,result.body,mime,Math.min(Number(body.limitBytes)||AUDIO_CACHE_LIMIT_BYTES,AUDIO_CACHE_LIMIT_BYTES));
        });downloads.set(body.key,task);downloadQueue=task;
      }
      const task=downloads.get(body.key);try{await task}finally{if(downloads.get(body.key)===task)downloads.delete(body.key)}
      res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');return true;
    }
    if(url.pathname.endsWith('/stats')){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(await cache.stats()));return true}
    if(req.method==='DELETE'){await cache.clear();res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');return true}
    if(req.method==='POST'){
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>180*1024*1024)throw new Error('Audio cache upload too large');chunks.push(chunk)}
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));await cache.write(body.key,Buffer.from(body.data,'base64'),body.mime,Math.min(Number(body.limitBytes)||AUDIO_CACHE_LIMIT_BYTES,AUDIO_CACHE_LIMIT_BYTES));
      res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');return true;
    }
    if(req.method==='HEAD'){res.writeHead(await cache.has(key)?200:404);res.end();return true}
    const entry=await cache.read(key);if(!entry){res.writeHead(404);res.end();return true}
    res.writeHead(200,{'Content-Type':entry.mime,'Content-Length':entry.data.length,'Cache-Control':'no-store'});res.end(entry.data);return true;
  };
}
