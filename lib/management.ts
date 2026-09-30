import {z} from 'zod';
import {can,type Member,calendarDate} from './domain';
import {db,one,rows,record,insert,audit,settings,id,statement} from './store';
import {AppError,json,digest} from './security';
import {financialRows,financeSummary} from './reports';

export async function managementRead(m:Member,resource:string,q:URLSearchParams){
 if(resource==='finance-summary'){if(m.status!=='adherent'&&!can(m,'finance-read')&&!can(m,'admin'))throw new AppError(403,'Synthèse réservée aux adhérents.');return json(await financeSummary(m.tenant,q))}
 if(resource==='ledger'){if(!can(m,'finance-read'))throw new AppError(403,'Accès réservé à la trésorerie et à l’auditeur.');return json(await financialRows(m.tenant,q))}
 if(resource==='my-ledger'){return json(await financialRows(m.tenant,q,m.id))}
 if(resource==='finance-history'){const authorized=can(m,'finance-read');return json(await rows("SELECT action,target,detail,created FROM audit WHERE tenant=? AND (scope='finance' OR action LIKE 'paiement_%' OR action LIKE 'preuve_%' OR action LIKE '%financi%' OR action IN ('export_finance','export_receipt') OR target IN (SELECT id FROM records WHERE tenant=audit.tenant AND kind='file' AND json_extract(data,'$.purpose') IN ('proof','finance_proof')))"+(authorized?'':" AND (subject=? OR (subject='' AND target IN (SELECT id FROM records WHERE tenant=audit.tenant AND ((kind='payment' AND owner=?) OR (kind='file' AND json_extract(data,'$.purpose')='proof' AND owner=?)))))")+' ORDER BY created DESC LIMIT 150',m.tenant,...(authorized?[]:[m.id,m.id,m.id])))}
 if(resource==='piece-comments'){const piece=await financialPiece(m,z.string().max(100).parse(q.get('id')));return json(await rows("SELECT id,json_extract(data,'$.body') body,json_extract(data,'$.opinion') opinion,json_extract(data,'$.author') author,updated FROM records WHERE tenant=? AND kind='audit_comment' AND json_extract(data,'$.file')=? ORDER BY updated DESC",m.tenant,piece.file.id))}
 if(resource==='dossier'){
  if(!can(m,'dossier-read'))throw new AppError(403,'Vous n’êtes pas habilité à consulter un dossier complet.');
  const key=z.string().max(100).parse(q.get('id'));const target=await one('SELECT * FROM members WHERE id=? AND tenant=?',key,m.tenant);if(!target)throw new AppError(404,'Dossier introuvable.');
  const p=JSON.parse(target.profile);await audit(m,'dossier_consulte',target.id).run();
  const events=await rows("SELECT e.id,json_extract(e.data,'$.title') title,json_extract(e.data,'$.date') date FROM records a JOIN records e ON e.id=json_extract(a.data,'$.event') AND e.tenant=a.tenant WHERE a.tenant=? AND a.kind='attendance' AND a.owner=? AND json_extract(a.data,'$.present')=1",m.tenant,target.id);
  return json({id:target.id,name:target.name,firstName:target.firstName,phone:target.phone,status:target.status,number:target.number,role:target.role,suspended:target.suspended,joined:target.joined,profile:p,participations:events});
 }
 return null;
}

export async function createFinanceEntry(m:Member,body:any){
 if(!can(m,'finance'))throw new AppError(403,'Saisie réservée à la trésorerie.');
 const data=z.object({title:z.string().trim().min(3).max(150),category:z.string().trim().min(2).max(80),amount:z.coerce.number().int().positive().max(100000000),type:z.enum(['recette','depense','don']),date:calendarDate,proof:z.string().max(100).default(''),member:z.string().max(100).default(''),event:z.string().max(100).default(''),donationSource:z.enum(['spontane','appel','evenement']).default('spontane'),campaign:z.string().trim().max(150).default(''),donorName:z.string().trim().max(150).default(''),donorReference:z.string().trim().max(100).default('')}).parse(body);
 const operationKey=z.string().uuid().parse(body.operationKey),fingerprint=await digest(JSON.stringify(data)),claim='finance:'+m.tenant+':'+operationKey;
 const existing=await one('SELECT value FROM claims WHERE id=?',claim);if(existing){const saved=JSON.parse(existing.value);if(saved.hash!==fingerprint)throw new AppError(409,'Cette référence correspond à une autre opération.');return json({ok:true,id:saved.id,message:'Cette écriture est déjà enregistrée.'})}
 const member=data.member?await one('SELECT * FROM members WHERE tenant=? AND id=?',m.tenant,data.member):null;
 if(data.member&&!member)throw new AppError(404,'Membre concerné introuvable.');
 if(data.event){const e=await record(m.tenant,data.event);if(!e||e.kind!=='event')throw new AppError(404,'Événement introuvable.')}
 if(data.type==='don'&&data.donationSource==='evenement'&&!data.event)throw new AppError(400,'Sélectionnez l’événement associé au don.');
 if(data.type==='don'&&data.donationSource==='appel'&&!data.campaign)throw new AppError(400,'Précisez l’appel au don.');
 if(data.proof){const f=await record(m.tenant,data.proof);if(!f||f.kind!=='file'||f.purpose!=='finance_proof'||f.owner!==m.id)throw new AppError(403,'Justificatif non autorisé.');if(f.scan!=='clean')throw new AppError(423,'Ce justificatif attend une analyse de sécurité.');if(await one("SELECT id FROM records WHERE tenant=? AND kind='finance' AND json_extract(data,'$.proof')=?",m.tenant,data.proof))throw new AppError(409,'Ce justificatif est déjà rattaché à une écriture.')}
 const key=id();try{await db().batch([statement('INSERT INTO claims(id,value) VALUES(?,?)',claim,JSON.stringify({id:key,hash:fingerprint})),...(data.proof?[statement('INSERT INTO claims(id,value) VALUES(?,?)','finance-proof:'+m.tenant+':'+data.proof,key)]:[]),insert(m.tenant,'finance',m.id,{...data,status:'approved',memberName:member?member.firstName+' '+member.name:'',recordedBy:m.id},key),audit(m,'ecriture_financiere',key,data.type+' · '+data.amount+' FCFA','finance',data.member)])}catch(error){
  const repeat=await one('SELECT value FROM claims WHERE id=?',claim);if(repeat){const saved=JSON.parse(repeat.value);if(saved.hash===fingerprint)return json({ok:true,id:saved.id,message:'Cette écriture est déjà enregistrée.'});throw new AppError(409,'Cette référence correspond à une autre opération.')}
  if(data.proof&&await one('SELECT id FROM claims WHERE id=?','finance-proof:'+m.tenant+':'+data.proof))throw new AppError(409,'Ce justificatif est déjà rattaché à une écriture.');throw error;
 }
 return json({ok:true,id:key,message:'Écriture et justificatif enregistrés dans la trésorerie.'});
}

export async function financialPiece(m:Member,key:string){
 const file=await record(m.tenant,key);if(!file||file.kind!=='file'||!['proof','finance_proof'].includes(file.purpose))throw new AppError(404,'Pièce comptable introuvable.');
 const parent=await one("SELECT * FROM records WHERE tenant=? AND kind IN ('payment','finance') AND json_extract(data,'$.proof')=? ORDER BY updated DESC LIMIT 1",m.tenant,key);if(!parent)throw new AppError(404,'Pièce non rattachée à une opération.');
 const p=JSON.parse(parent.data),subject=parent.kind==='payment'?parent.owner:p.member||'';
 if(!can(m,'finance-read')&&subject!==m.id)throw new AppError(403,'Cette pièce est réservée aux responsables comptables et au membre concerné.');return {file,parent,subject};
}
export async function commentFinancialPiece(m:Member,body:any){
 if(m.role!=='auditor'||!can(m,'finance-read'))throw new AppError(403,'Seul l’auditeur peut ajouter une observation de contrôle.');
 const p=z.object({file:z.string().min(1).max(100),body:z.string().trim().min(3).max(3000),opinion:z.enum(['Observation','À clarifier','Conforme']),operationKey:z.string().uuid()}).parse(body);
 const piece=await financialPiece(m,p.file),key='audit-comment:'+m.tenant+':'+p.operationKey;
 const exists=await record(m.tenant,key);if(exists){if(exists.owner!==m.id||exists.body!==p.body||exists.file!==p.file||exists.opinion!==p.opinion)throw new AppError(409,'Cette référence de commentaire est déjà utilisée.');return json({ok:true,id:key,message:'Observation déjà enregistrée.'})}
 await db().batch([insert(m.tenant,'audit_comment',m.id,{file:p.file,body:p.body,opinion:p.opinion,author:m.firstName+' '+m.name,transaction:piece.parent.id},key),audit(m,'observation_auditeur',piece.parent.id,p.opinion,'finance',piece.subject)]);
 return json({ok:true,id:key,message:'Observation de l’auditeur enregistrée. L’écriture reste inchangée.'});
}
