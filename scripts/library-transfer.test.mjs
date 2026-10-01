import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {authorizeImport, uploadBundle, inventory, commitImport, ready, readAsset, objectKey, prefix, rangeFor, boundedBody, MAX_BUNDLE} from '../lib/library-transfer.ts';
const hash = b => createHash('sha256').update(b).digest('hex');
const data = [Buffer.from('%PDF-example-for-test'),Buffer.from('second resource'),Buffer.from('third resource')];
const files = Object.fromEntries(data.map((b,i)=>['livre-test/section-'+i+'.pdf',{sha256:hash(b),size:b.length,mime:'application/pdf'}]));
const m={release:'a'.repeat(64),books:1,files};
class Bucket {
  store=new Map(); puts=0;
  async put(key, value, options={}) {
    const body=typeof value==='string'?Buffer.from(value):Buffer.from(value);
    if(options.sha256)assert.equal(hash(body),options.sha256);
    this.store.set(key,{key,bytes:body,size:body.length,customMetadata:options.customMetadata});this.puts++;
    return this.store.get(key);
  }
  async get(key, options={}) {
    const item=this.store.get(key);if(!item)return null;
    const b=options.range?item.bytes.subarray(options.range.offset,options.range.offset+options.range.length):item.bytes;
    return {...item,body:new Response(b).body,json:async()=>JSON.parse(item.bytes.toString())};
  }
  async list({prefix,cursor}) {
    const all=[...this.store.values()].filter(x=>x.key.startsWith(prefix));const start=Number(cursor||0);
    return {objects:all.slice(start,start+2),truncated:start+2<all.length,cursor:String(start+2)};
  }
}
function bundle(paths=Object.keys(files),bodies=data) {
  const header=Buffer.from(JSON.stringify(paths)),size=Buffer.alloc(4);size.writeUInt32BE(header.length);
  return Buffer.concat([size,header,...bodies]);
}
async function rejects(p,status){await assert.rejects(p,e=>e.status===status);}
const secret='b'.repeat(64),settings={LIBRARY_IMPORT_HASH:hash(secret),LIBRARY_IMPORT_UNTIL:new Date(Date.now()+600000).toISOString()};
const request=(token=secret,extra={})=>new Request('https://site.example/api/library-import',{headers:{'x-jfsi-import-token':token,...extra}});
test('Import : secret valable seulement avant expiration',async()=>{await authorizeImport(request(),settings);await rejects(authorizeImport(request(),settings,Date.now()+700000),403);});
test('Import : configuration absente ou secret incorrect refusés',async()=>{await rejects(authorizeImport(request(),{}),403);await rejects(authorizeImport(request('c'.repeat(64)),settings),403);});
test('Import : origine externe refusée',async()=>{await rejects(authorizeImport(request(secret,{origin:'https://evil.example'}),settings),403);});
test('Corps : limite réelle même sans content-length',async()=>{const req=new Request('https://site.example',{method:'POST',body:Buffer.alloc(MAX_BUNDLE+1)});await rejects(boundedBody(req),413);});
test('Lot valide, SHA vérifié, réenvoi idempotent',async()=>{const b=new Bucket();await uploadBundle(b,m,bundle());await uploadBundle(b,m,bundle());assert.equal(b.store.size,3);assert.deepEqual((await inventory(b,m)).missing,[]);});
test('Aucune écriture si un fichier du lot a été altéré',async()=>{const b=new Bucket();const raw=bundle();raw[raw.length-1]^=1;await rejects(uploadBundle(b,m,raw),422);assert.equal(b.puts,0);});
test('Liste fermée : traversée, encodage et chemin inconnu',async()=>{for(const p of ['../live/proof','%2e%2e/x','live\\proof','missing']){const b=new Bucket();await rejects(uploadBundle(b,m,bundle([p],[data[0]])),400);assert.equal(b.puts,0);}});
test('Lot incomplet, doublons et octets excédentaires refusés',async()=>{for(const raw of [bundle().subarray(0,-1),Buffer.concat([bundle(),Buffer.from('x')])])await rejects(uploadBundle(new Bucket(),m,raw),422);await rejects(uploadBundle(new Bucket(),m,bundle([Object.keys(files)[0],Object.keys(files)[0]],[data[0],data[0]])),400);});
test('Une importation partielle ne peut pas être activée',async()=>{const b=new Bucket();await uploadBundle(b,m,bundle([Object.keys(files)[0]],[data[0]]));await rejects(commitImport(b,m),409);assert.equal(await ready(b,m),false);});
test('Inventaire paginé, reprise des seuls fichiers manquants',async()=>{const b=new Bucket();await uploadBundle(b,m,bundle());b.store.delete(objectKey(m,Object.values(files)[1]));assert.deepEqual((await inventory(b,m)).missing,[Object.keys(files)[1]]);});
test('Métadonnées altérées non considérées comme valides',async()=>{const b=new Bucket();await uploadBundle(b,m,bundle());b.store.get(objectKey(m,Object.values(files)[0])).customMetadata.sha256='x';assert.equal((await inventory(b,m)).missing.length,1);await rejects(commitImport(b,m),409);});
test('Isolation des versions et des autres pièces privées',async()=>{const b=new Bucket();await b.put('live/proof','private');await uploadBundle(b,m,bundle());await commitImport(b,m);assert.equal((await b.get('live/proof')).size,7);assert.equal(await ready(b,{...m,release:'d'.repeat(64)}),false);});
test('Un marqueur incohérent ne débloque pas la bibliothèque',async()=>{const b=new Bucket();await b.put(prefix(m)+'ready.json',JSON.stringify({release:m.release,files:2,books:1}));assert.equal(await ready(b,m),false);await rejects(readAsset(b,m,Object.keys(files)[0],new Request('https://site.example')),503);});
test('Lecture complète PDF et plage de trois octets',async()=>{const b=new Bucket();await uploadBundle(b,m,bundle());await commitImport(b,m);const p=Object.keys(files)[0];let r=await readAsset(b,m,p,new Request('https://site.example'));assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/pdf');assert.equal(await r.text(),data[0].toString());r=await readAsset(b,m,p,new Request('https://site.example',{headers:{range:'bytes=1-3'}}));assert.equal(r.status,206);assert.equal(await r.text(),data[0].subarray(1,4).toString());});
test('Plages suffixe, fin ouverte et entrées invalides',()=>{assert.deepEqual(rangeFor('bytes=-3',10),{start:7,end:9,partial:true});assert.deepEqual(rangeFor('bytes=8-',10),{start:8,end:9,partial:true});for(const s of ['bytes=-0','bytes=10-','bytes=5-2','bytes=0-1,4-5','bytes=99999999999999999999-','bytes=-'])assert.equal(rangeFor(s,10),null);});
test('Réponse416 et refus des fichiers hors catalogue',async()=>{const b=new Bucket();await uploadBundle(b,m,bundle());await commitImport(b,m);const r=await readAsset(b,m,Object.keys(files)[0],new Request('https://site.example',{headers:{range:'bytes=100-'}}));assert.equal(r.status,416);await rejects(readAsset(b,m,'../live/proof',new Request('https://site.example')),404);});
test('HEAD et cache conditionnel conservent les contenus privés',async()=>{const b=new Bucket();await uploadBundle(b,m,bundle());await commitImport(b,m);const p=Object.keys(files)[0],a=files[p];const h=await readAsset(b,m,p,new Request('https://site.example',{method:'HEAD'}));assert.equal(await h.text(),'');assert.match(h.headers.get('cache-control'),/^private/);const r=await readAsset(b,m,p,new Request('https://site.example',{headers:{'if-none-match':'"'+a.sha256+'"'}}));assert.equal(r.status,304);});
test('Après fermeture du secret, lecture conservée, import refusé',async()=>{const b=new Bucket();await uploadBundle(b,m,bundle());await commitImport(b,m);await rejects(authorizeImport(request(),{}),403);assert.equal((await readAsset(b,m,Object.keys(files)[0],new Request('https://site.example'))).status,200);});
