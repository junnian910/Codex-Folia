import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

// Check upload candidates and staged bytes; never print matched credential values.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const local=process.argv.includes('--check-local'),findings=[];
function git(args,input){const result=spawnSync('git',['-C',root,...args],{input,encoding:input===undefined?'utf8':undefined,maxBuffer:512*1024*1024,windowsHide:true});return result.status===0?result.stdout:null}
const listed=git(['ls-files','--cached','--others','--exclude-standard','-z']);
if(listed===null)throw new Error('Run this check inside an initialized Git repository.');
const files=[...new Set(listed.split('\0').filter(Boolean))].filter(p=>p!=='docs/privacy-check.json');
const identities=[],credentials=[];
if(local){
  const username=os.userInfo().username;
  if(username.length>=5&&!/^(admin|administrator|runner|runneradmin|default|public)$/i.test(username))identities.push(username);
  for(const key of ['user.name','user.email']){
    const result=spawnSync('git',['config','--global','--get',key],{encoding:'utf8',windowsHide:true});
    const value=result.status===0?result.stdout.trim():'';
    if(value.length>=5&&!value.includes('codex-folia.invalid'))identities.push(value);
  }
  const envPath=path.join(os.homedir(),'.codex','.env');
  if(fs.existsSync(envPath))for(const line of fs.readFileSync(envPath,'utf8').split(/\r?\n/)){
    const match=line.match(/^\s*(?:export\s+)?([A-Za-z_][\w]*)\s*=\s*(.*?)\s*$/);
    if(!match||!/KEY|TOKEN|SECRET|PASSWORD|COOKIE|API_URL|BASE_URL/i.test(match[1]))continue;
    const value=match[2].replace(/^(['"])(.*)\1$/,'$2');
    if(value.length>=16&&!/your_|example|placeholder/i.test(value))credentials.push(value);
  }
}
const sensitivePath=/(?:^|\/)(?:\.git|\.dev-credentials|profile|backend-temp|IndexedDB|Local Storage|Session Storage|backups?)(?:\/|$)|(?:^|\/)(?:Cookies|History|Login Data|Web Data|Local State|Preferences|settings\.json|anonymous_token|xeapi_public_key)$|\.log$|(?:^|\/)\.env(?!\.example$)/i;
let bytes=0,largest={file:'',bytes:0};
function check(file,buffer,origin){
  if(sensitivePath.test(file))findings.push({file,kind:'sensitive file path',origin});
  for(const value of identities)if(buffer.includes(Buffer.from(value))||buffer.includes(Buffer.from(value,'utf16le')))findings.push({file,kind:'local identity',origin});
  for(const value of credentials)if(buffer.includes(Buffer.from(value))||buffer.includes(Buffer.from(value,'utf16le')))findings.push({file,kind:'local credential',origin});
  if(buffer.length>100*1024*1024)findings.push({file,kind:'exceeds GitHub regular file limit',origin});
  if(/\.(?:js|mjs|cjs|ts|tsx|json|md|ya?ml|ps1|nsi|nsh|html|css|txt)$/.test(file)){
    const text=buffer.toString('utf8');
    if(/(?:sk-[A-Za-z0-9_-]{24,}|AIza[\w-]{30,})/.test(text)&&!/\b(?:fixture|example|mock|test)\b/i.test(file))findings.push({file,kind:'credential-shaped literal',origin});
    if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)&&!/(?:^|\/)(?:test|tests|fixtures|dev)\//.test(file))findings.push({file,kind:'private key block',origin});
  }
}
for(const file of files){const absolute=path.join(root,file);if(!fs.existsSync(absolute))continue;const data=fs.readFileSync(absolute);bytes+=data.length;if(data.length>largest.bytes)largest={file,bytes:data.length};check(file,data,'working tree')}
// Batch-read Git's index as well, so a cleaned working file cannot hide an older staged secret.
const staged=(git(['ls-files','--stage','-z'])||'').split('\0').filter(Boolean).map(line=>{const m=line.match(/^\d+ ([a-f0-9]+) \d\t(.+)$/s);return m?{hash:m[1],file:m[2]}:null}).filter(Boolean).filter(e=>e.file!=='docs/privacy-check.json');
const hashes=[...new Set(staged.map(e=>e.hash))],objects=new Map();
if(hashes.length){
  const batch=git(['cat-file','--batch'],Buffer.from(hashes.join('\n')+'\n'));if(!batch)throw new Error('Cannot inspect staged Git objects.');
  let offset=0;
  while(offset<batch.length){const end=batch.indexOf(10,offset),header=batch.subarray(offset,end).toString('utf8').split(' '),size=Number(header[2]);if(end<0||!Number.isFinite(size))throw new Error('Invalid Git object response.');objects.set(header[0],batch.subarray(end+1,end+1+size));offset=end+size+2}
  for(const entry of staged)check(entry.file,objects.get(entry.hash), 'Git index');
}
const config=JSON.parse(fs.readFileSync(path.join(root,'app','settings.example.json'),'utf8'));
const aiEmpty=Object.values(config.ai).every(v=>v==='');
if(!aiEmpty)findings.push({file:'app/settings.example.json',kind:'AI defaults must be empty'});
const author=(git(['config','--local','--get','user.name'])||'').trim(),email=(git(['config','--local','--get','user.email'])||'').trim();
const anonymous=author==='Codex Folia Contributors'&&email==='contributors@codex-folia.invalid';
const unique=[...new Map(findings.map(f=>[JSON.stringify(f),f])).values()];
const report={status:unique.length?'failed':'passed',workingFiles:files.length,stagedFiles:staged.length,bytesScanned:bytes,largestFile:largest,checks:{localComparisonEnabled:local,personalDataMatches:unique.filter(f=>/local identity|local credential/.test(f.kind)).length,aiDefaultsEmpty:aiEmpty,anonymousLocalGitAuthor:anonymous},commitCount:Number((git(['rev-list','--all','--count'])||'0').trim()),remoteCount:(git(['remote'])||'').trim().split(/\r?\n/).filter(Boolean).length,findings:unique};
fs.writeFileSync(path.join(root,'docs','privacy-check.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(unique.length)process.exitCode=1;
