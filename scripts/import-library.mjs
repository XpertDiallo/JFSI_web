import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const manifest=JSON.parse(readFileSync('lib/book-assets.json','utf8'));
const root=path.resolve('public/books');
let config;
async function hiddenInput(){
  console.log('Ready for library import JSON on stdin (input is hidden).');
  process.stdin.setEncoding('utf8');if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stdin.resume();
  return await new Promise((resolve,reject)=>{let text='';function read(s){text+=s;if(text.includes('\u0003'))process.exit(130);if(/[\r\n]/.test(text)){process.stdin.off('data',read);if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();try{resolve(JSON.parse(text.trim()));}catch{reject(new Error('Configuration invalide.'));}}}process.stdin.on('data',read);});
}
import {requestImport} from './import-request.mjs';
const api=(suffix='',body)=>requestImport(config,suffix,body);
function batches(missing){const result=[];let group=[],size=0;for(const name of missing){const a=manifest.files[name];if(!a)throw new Error('Le serveur réclame un fichier hors manifeste.');if(group.length&&(size+a.size>4*1024*1024||group.length>=32)){result.push(group);group=[];size=0;}group.push(name);size+=a.size;}if(group.length)result.push(group);return result;}
function pack(group){const header=Buffer.from(JSON.stringify(group)),n=Buffer.alloc(4);n.writeUInt32BE(header.length);const bodies=group.map(name=>{const full=path.resolve(root,name);if(!full.startsWith(root+path.sep))throw new Error('Chemin interdit.');const bytes=readFileSync(full),a=manifest.files[name];if(bytes.length!==a.size||createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw new Error('Ressource locale modifiée : '+name);return bytes;});return Buffer.concat([n,header,...bodies]);}
try{
  config=await hiddenInput();
  if(config.origin!=='https://jfsi-communaute.xpertpro.chatgpt.site'||!config.sitesToken||!config.importToken)throw new Error('Configuration invalide.');
  const status=await api();
  if(status.release!==manifest.release||status.files!==Object.keys(manifest.files).length)throw new Error('Version distante différente ; ne pas importer.');
  console.log(JSON.stringify({release:status.release,files:status.files,missing:status.missing.length,ready:status.ready}));
  if(config.mode==='status')process.exit(0);
  const tasks=batches(status.missing);let index=0,done=0,bytes=0;const start=Date.now();
  await Promise.all(Array.from({length:3},async()=>{for(;;){const i=index++;if(i>=tasks.length)return;const body=pack(tasks[i]);await api('?action=upload',body);done+=tasks[i].length;bytes+=body.length;console.log(JSON.stringify({uploaded:done,remaining:status.missing.length-done,megabytes:Math.round(bytes/1000000),seconds:Math.round((Date.now()-start)/1000)}));}}));
  const committed=await api('?action=commit',Buffer.from('{}'));
  console.log(JSON.stringify({...committed,importComplete:true}));
}catch(e){console.error(e.message);process.exitCode=1;}
