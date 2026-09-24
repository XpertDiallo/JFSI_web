import {env} from 'cloudflare:workers';
import {requireMember} from '@/lib/auth';
import {can} from '@/lib/domain';
import {requireEligible,visibleMarriage} from '@/lib/marriage';
import {record,rate} from '@/lib/store';
import {AppError,failure,headersSecure} from '@/lib/security';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const {member:m}=await requireMember();await rate('marriage-photo:'+m.id,100,300);const r=await record(m.tenant,new URL(req.url).searchParams.get('id')||'');if(!r||r.kind!=='marriage')throw new AppError(404,'Photo indisponible.');if(!can(m,'admin')&&r.owner!==m.id){await requireEligible(m);if(!await visibleMarriage(r))throw new AppError(404,'Photo indisponible.')}const f=await record(m.tenant,r.profile.photo);if(!f||f.purpose!=='marriage_photo'||f.scan!=='clean')throw new AppError(423,'La photo attend son analyse de sécurité.');const obj=await env.BUCKET?.get(m.tenant+'/'+f.id);if(!obj)throw new AppError(404,'Photo indisponible.');return new Response(obj.body,{headers:{...headersSecure,'Content-Type':f.mime,'Content-Security-Policy':"default-src 'none'; sandbox"}})}catch(e){return failure(e)}}
