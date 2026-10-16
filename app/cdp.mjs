// Minimal CDP transport for the local Codex customization endpoint.
export async function discoverCodex(port=9338){
  if(!Number.isInteger(Number(port))||Number(port)<1||Number(port)>65535)throw new Error('调试端口无效。');
  for(const hostname of ['127.0.0.1','[::1]']){
    try{const response=await fetch(`http://${hostname}:${port}/json/list`,{signal:AbortSignal.timeout(1200)});if(!response.ok)continue;const targets=await response.json();if(Array.isArray(targets))return {hostname,targets}}catch{}
  }
  throw new Error('Codex 本机调试接口尚未就绪。');
}
export class Cdp {
  constructor(url) {
    const parsed = new URL(url);
    if (!['127.0.0.1','[::1]'].includes(parsed.hostname) || parsed.protocol !== 'ws:') throw new Error('只允许本机调试接口。');
    this.ws = new WebSocket(url); this.next = 0; this.pending = new Map();
    this.ready = new Promise((resolve,reject) => {
      this.ws.addEventListener('open',resolve,{once:true});
      this.ws.addEventListener('error',()=>reject(new Error('调试接口连接失败。')),{once:true});
    });
    this.ws.addEventListener('message',event=>{
      const data=JSON.parse(event.data); const item=this.pending.get(data.id);
      if(item){clearTimeout(item.timer);this.pending.delete(data.id);data.error?item.reject(new Error(data.error.message)):item.resolve(data.result);}
    });
    this.ws.addEventListener('close',()=>{for(const item of this.pending.values()){clearTimeout(item.timer);item.reject(new Error('Codex 调试连接已关闭。'));}this.pending.clear();});
  }
  async send(method,params={}) {
    await this.ready; const id=++this.next;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`${method} 超时。`));},10000);
      this.pending.set(id,{resolve,reject,timer}); this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  async evaluate(expression) {
    const result=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  close(){this.ws.close();}
}

if(process.argv[2]==='--probe'){
  try{const result=await discoverCodex(Number(process.argv[3]||9338));console.log(JSON.stringify({ready:true,hostname:result.hostname}))}catch{console.log(JSON.stringify({ready:false}))}
}
