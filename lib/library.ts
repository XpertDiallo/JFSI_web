import suppliedBooks from './books.json';
import {z} from 'zod';
import {active,can,type Member} from './domain';
import {context,requireMember} from './auth';
import {AppError,json} from './security';
import {audit,db,id,insert,list,record,update,rows} from './store';
import {seedEditorial} from './editorial';
export const libraryCategories=['Coran & Tafsir','Hadith & Sounna','Fiqh & Jurisprudence','Spiritualité & Croyance','Éducation & Famille','Histoire & Biographies','Jeunesse & Enfants','Leadership & Développement personnel'];
type Context=Awaited<ReturnType<typeof context>>;
export function canReadCollection(c:Context,r:any){if(r.hidden||r.deleted||r.status!=='Publié'||r.publishAt&&r.publishAt>new Date().toISOString())return false;return r.visibility==='public'||active(c.member)&&(r.visibility==='members'||can(c.member,'publish')&&c.mfa)}
const publicItem=(r:any)=>({id:r.id,title:r.title,description:r.description||'',author:r.author||'',category:r.category,language:r.language||'Français',format:r.format,source:r.source||'',url:'/api/reading/'+r.id,status:r.status,visibility:r.visibility,publishAt:r.publishAt||''});
export async function catalogue(c:Context,collection:string){
 const kind=collection==='bibliotheque'?'library':'media';const records=await rows("SELECT r.* FROM records r JOIN records f ON f.id=json_extract(r.data,'$.file') AND f.tenant=r.tenant AND f.kind='file' WHERE r.tenant=? AND r.kind=? AND json_extract(f.data,'$.purpose')='reading' AND json_extract(f.data,'$.scan')='clean' ORDER BY r.updated DESC",c.tenant,kind);const items=records.map(r=>({...r,...JSON.parse(r.data)})).filter(r=>canReadCollection(c,r));if(items.some(r=>r.visibility!=='public'))await requireMember(undefined,c);const result=items.map(publicItem);
 if(kind==='library')result.push(...suppliedBooks.map(({originalName,sha256,originalBytes,readingBytes,...book})=>book));
 if(kind==='media'){
  await seedEditorial(c.tenant);
  const posters=(await list(c.tenant,'content')).filter(r=>r.image&&canReadCollection(c,r));
  result.push(...posters.map(r=>({id:r.id,title:r.title,description:r.body,author:'JFSI',category:'Affiche',language:'Français',format:'image',source:'Communication transmise par le JFSI',url:r.image,status:r.status,visibility:r.visibility,publishAt:''})));
  result.push({id:'logo-officiel',title:'Logo officiel du JFSI',description:'Identité visuelle du Jardin des Frères et Sœurs en Islam.',author:'JFSI',category:'Logo',language:'Français',format:'image',source:'JFSI',url:'/logo.jpeg',status:'Publié',visibility:'public',publishAt:''});
  result.push({id:'statuts-originaux',title:'Statuts et règlement intérieur',description:'Version originale transmise par le JFSI.',author:'JFSI',category:'Document',language:'Français',format:'pdf',source:'JFSI',url:'/documents/statuts-jfsi-v1.pdf',status:'Publié',visibility:'public',publishAt:''});
 }
 return result.sort((a,b)=>a.title.localeCompare(b.title,'fr'));
}
export async function saveCollection(m:Member,b:any){
 if(!can(m,'publish'))throw new AppError(403,'Gestion réservée aux responsables de publication.');
 const p=z.object({collection:z.enum(['bibliotheque','mediatheque']),title:z.string().trim().min(3).max(150),description:z.string().trim().max(2000).default(''),author:z.string().trim().max(150),category:z.string().trim().min(2).max(80),language:z.string().trim().min(2).max(50),source:z.string().trim().min(3).max(300),file:z.string().min(1).max(100),visibility:z.enum(['public','members','staff']),status:z.enum(['Brouillon','Publié','Archivé']),publishAt:z.union([z.string().datetime(),z.literal('')]).default(''),rights:z.literal(true)}).parse(b.item);
 const kind=p.collection==='bibliotheque'?'library':'media';const old=b.id?await record(m.tenant,String(b.id)):null;if(b.id&&(!old||old.kind!==kind))throw new AppError(404,'Ressource introuvable.');
 const f=await record(m.tenant,p.file);if(!f||f.kind!=='file'||f.purpose!=='reading'||f.owner!==m.id&&old?.file!==f.id)throw new AppError(403,'Fichier de lecture non autorisé.');
 if(f.scan!=='clean')throw new AppError(423,'L’analyse de sécurité doit être terminée avant publication.');
 if(kind==='library'&&(f.mime!=='application/pdf'||!libraryCategories.includes(p.category)))throw new AppError(400,'La bibliothèque accepte les ouvrages PDF dans une catégorie proposée.');
 const format=f.mime==='application/pdf'?'pdf':f.mime.startsWith('video/')?'video':f.mime.startsWith('audio/')?'audio':'image';const data={...p,format};
 if(old)await update(m,old,data,'ressource_editoriale_modifiee');else{const key=id();await db().batch([insert(m.tenant,kind,m.id,data,key),audit(m,'ressource_editoriale_creee',key)])}
 return json({ok:true,message:'Ressource enregistrée.'});
}
export async function readingItem(c:Context,key:string){const r=await record(c.tenant,key);if(!r||!['library','media'].includes(r.kind)||!canReadCollection(c,r))throw new AppError(404,'Ressource indisponible.');if(r.visibility!=='public')await requireMember(undefined,c);const f=await record(c.tenant,r.file);if(!f||f.kind!=='file'||f.purpose!=='reading'||f.scan!=='clean')throw new AppError(423,'Ressource non disponible pour la lecture.');return {r,f}}
