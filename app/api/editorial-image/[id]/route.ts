import images from '@/.sites-private/editorial-assets';
import {context,requireMember} from '@/lib/auth';
import {seedEditorial} from '@/lib/editorial';
import {active,can} from '@/lib/domain';
import {AppError,failure,headersSecure} from '@/lib/security';
import {one} from '@/lib/store';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){try{
 const c=await context(),key=(await params).id,im=images[key];if(!im)throw new AppError(404,'Image introuvable.');await seedEditorial(c.tenant);
 const row=await one("SELECT * FROM records WHERE tenant=? AND kind IN ('content','topic') AND json_extract(data,'$.assetKey')=? LIMIT 1",c.tenant,key);const related=row?{...row,...JSON.parse(row.data)}:null;
 if(!related||related.hidden||related.deleted)throw new AppError(404,'Image indisponible.');
 const privileged=can(c.member,'publish')&&c.mfa;
 if(!privileged&&(['Brouillon','Archivé'].includes(related.status)||related.publishAt&&related.publishAt>new Date().toISOString()))throw new AppError(404,'Image indisponible.');
 if(related.visibility!=='public'){
  const {member:m,mfa}=await requireMember(undefined,c);
  if(!active(m)||related.visibility==='staff'&&((!['admin','accountant','cm','auditor'].includes(m.role)&&!can(m,'publish'))||!mfa))throw new AppError(403,'Ce support est réservé à son public autorisé.');
 }
 return new Response(Uint8Array.from(atob(im.data),c=>c.charCodeAt(0)),{headers:{...headersSecure,'Content-Type':'image/jpeg'}})
}catch(e){return failure(e)}}
