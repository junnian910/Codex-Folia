import http from 'node:http';
import https from 'node:https';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';

// Folia media uses direct sockets, independent of Chromium's system proxy.
export function openDirectResponse(url, headers = {}, redirects = 5, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    // Let Node derive Host from each URL, including cross-host CDN redirects.
    const requestHeaders = Object.fromEntries(Object.entries(headers).filter(([name])=>name.toLowerCase()!=='host'));
    const request = (target.protocol === 'https:' ? https : http).request(target, { headers: requestHeaders, method, agent: false }, response => {
      if ([301,302,303,307,308].includes(response.statusCode) && response.headers.location && redirects > 0) {
        response.resume();
        const next=new URL(response.headers.location, target),nextHeaders={...headers};
        if(next.origin!==target.origin)for(const name of Object.keys(nextHeaders))if(['authorization','cookie'].includes(name.toLowerCase()))delete nextHeaders[name];
        const toGet=response.statusCode===303||([301,302].includes(response.statusCode)&&method==='POST');
        if(toGet)for(const name of Object.keys(nextHeaders))if(['content-length','content-type'].includes(name.toLowerCase()))delete nextHeaders[name];
        resolve(openDirectResponse(next.href, nextHeaders, redirects - 1, toGet?'GET':method, toGet?undefined:body));
        return;
      }
      resolve(response);
    });
    request.setTimeout(35000, ()=>request.destroy(new Error('Folia 直连请求超时。')));
    request.on('error', reject);
    request.end(body);
  });
}

export async function requestDirect(url,headers={},redirects=5,method='GET',body){
  const response=await openDirectResponse(url,headers,redirects,method,body),chunks=[];
  for await(const chunk of response)chunks.push(chunk);
  return {status:response.statusCode,headers:response.rawHeaders,body:Buffer.concat(chunks)};
}

// RPC fetches create Response objects in JavaScript, so decode content before returning bytes.
export async function fetchDirectResponse(url, { headers = {}, method = 'GET', body } = {}) {
  const cleanHeaders=Object.fromEntries(Object.entries(headers).filter(([key])=>key.toLowerCase()!=='accept-encoding'));
  const result=await requestDirect(url,{...cleanHeaders,'Accept-Encoding':'identity'},5,method,body);
  const responseHeaders={};for(let i=0;i<result.headers.length;i+=2)responseHeaders[result.headers[i].toLowerCase()]=result.headers[i+1];
  const encoding=responseHeaders['content-encoding'];
  const data=method==='HEAD'?Buffer.alloc(0):encoding==='gzip'?gunzipSync(result.body):encoding==='br'?brotliDecompressSync(result.body):encoding==='deflate'?inflateSync(result.body):result.body;
  for(const key of ['content-encoding','transfer-encoding','connection','content-length'])delete responseHeaders[key];
  return {status:result.status,headers:responseHeaders,body:data.toString('base64')};
}

export async function enableDirectMedia(session,streamOrigin) {
  session.directMediaFrames = new Set();
  session.directMediaRequests = 0;
  session.ws.addEventListener('message', async event => {
    const message=JSON.parse(event.data);
    if(message.method!=='Fetch.requestPaused')return;
    const {requestId,request,frameId,resourceType}=message.params;
    if(!session.directMediaFrames.has(frameId)) {
      await session.send('Fetch.continueRequest',{requestId}).catch(()=>{});
      return;
    }
    try {
      if(streamOrigin&&resourceType==='Media'){
        // Chromium receives the first audio bytes as they arrive, rather than waiting for an entire song over CDP.
        if(!request.url.startsWith(streamOrigin+'/integration/audio-stream?')){
          await session.send('Fetch.continueRequest',{requestId,url:streamOrigin+'/integration/audio-stream?url='+encodeURIComponent(request.url)});session.directMediaRequests++;
        }else await session.send('Fetch.continueRequest',{requestId});
        return;
      }
      const body=request.postDataEntries?.length?Buffer.concat(request.postDataEntries.map(item=>Buffer.from(item.bytes||'','base64'))):request.postData;
      const result=await requestDirect(request.url,request.headers,5,request.method,body);
      const responseHeaders=[];
      // Node already removes transfer framing, while content bytes remain compressed.
      for(let i=0;i<result.headers.length;i+=2)if(!['transfer-encoding','connection','content-length'].includes(result.headers[i].toLowerCase()))responseHeaders.push({name:result.headers[i],value:result.headers[i+1]});
      responseHeaders.push({name:'Content-Length',value:String(result.body.length)});
      await session.send('Fetch.fulfillRequest',{requestId,responseCode:result.status,responseHeaders,body:result.body.toString('base64')});
      session.directMediaRequests++;
    } catch {
      await session.send('Fetch.failRequest',{requestId,errorReason:'ConnectionFailed'}).catch(()=>{});
    }
  });
  // Frame IDs limit this to Folia, including song/lyric downloads and other artwork CDNs.
  await session.send('Fetch.enable',{patterns:[{urlPattern:'http://*/*'},{urlPattern:'https://*/*'}]});
}
