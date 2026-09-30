import {env} from 'cloudflare:workers';
import {context,requireMember} from '@/lib/auth';
import {one,record,audit} from '@/lib/store';
import {active,can} from '@/lib/domain';
import {AppError,failure,headersSecure} from '@/lib/security';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){try{
 const c=await context(),key=(await params).id,f=await record(c.tenant,key);if(!f||f.kind!=='file'||!['poster','photo'].includes(f.purpose)||!['image/png','image/jpeg'].includes(f.mime))throw new AppError(404,'Image introuvable.');
 if(f.purpose==='photo'){
  const {member:m}=await requireMember(undefined,c);if(m.id!==f.owner&&!can(m,'dossier-read'))throw new AppError(403,'Photo privée.');
  const owner=await one("SELECT id FROM members WHERE tenant=? AND id=? AND json_extract(profile,'$.photo')=?",m.tenant,f.owner,key);if(!owner)throw new AppError(404,'Photo indisponible.');
  if(m.id!==f.owner)await audit(m,'photo_identite_consultee',f.owner).run();
 }else{
  const parent=await one("SELECT * FROM records WHERE tenant=? AND kind IN ('content','event','topic') AND json_extract(data,'$.poster')=? LIMIT 1",c.tenant,key);if(!parent)throw new AppError(404,'Affiche non publiée.');const p=JSON.parse(parent.data);
  if(p.hidden||p.deleted||['Brouillon','Archivé'].includes(p.status)||p.publishAt&&p.publishAt>new Date().toISOString())throw new AppError(404,'Affiche indisponible.');
  if(parent.kind==='topic'||p.visibility!=='public'){const {member:m,mfa}=await requireMember(undefined,c);if(!active(m)||p.visibility==='staff'&&((!['admin','accountant','cm','auditor'].includes(m.role)&&!can(m,'publish'))||!mfa))throw new AppError(403,'Affiche réservée aux membres autorisés.')}
 }
 if(f.scan!=='clean')throw new AppError(423,'Image en attente d’analyse.');const obj=await env.BUCKET?.get(c.tenant+'/'+key);if(!obj)throw new AppError(404,'Image indisponible.');return new Response(obj.body,{headers:{...headersSecure,'Content-Type':f.mime,'Content-Disposition':'inline','Content-Security-Policy':"sandbox; default-src 'none'"}});
}catch(e){return failure(e)}}
