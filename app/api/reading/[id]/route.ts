import {env} from 'cloudflare:workers';
import {context} from '@/lib/auth';
import {readingItem} from '@/lib/library';
import {AppError,failure,headersSecure} from '@/lib/security';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){try{
 const c=await context(),{f}=await readingItem(c,(await params).id);const range=req.headers.get('range');let start=0,end=f.size-1,partial=false;
 if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||!match[1]&&!match[2])return new Response(null,{status:416,headers:{...headersSecure,'Content-Range':'bytes */'+f.size}});if(!match[1]){const length=Number(match[2]);start=Math.max(0,f.size-length)}else{start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end)}if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=f.size)return new Response(null,{status:416,headers:{...headersSecure,'Content-Range':'bytes */'+f.size}});partial=true}
 const object=await env.BUCKET?.get(c.tenant+'/'+f.id,partial?{range:{offset:start,length:end-start+1}}:undefined);if(!object)throw new AppError(404,'Fichier indisponible.');return new Response(object.body,{status:partial?206:200,headers:{...headersSecure,'Content-Type':f.mime,'Content-Disposition':'inline','Accept-Ranges':'bytes','Content-Length':String(end-start+1),...(partial?{'Content-Range':`bytes ${start}-${end}/${f.size}`}:{}) ,'Content-Security-Policy':"sandbox; default-src 'none'"}});
 }catch(e){return failure(e)}}
