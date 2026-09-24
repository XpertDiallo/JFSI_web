import {AppError} from './security';
import {db,id,one,statement} from './store';
import {active,can,type Member} from './domain';

export async function reviewRegistration(actor:Member,targetId:string,accept:boolean,reason:string){
 if(!can(actor,'registration-review'))throw new AppError(403,'Validation des inscriptions non autorisée.');
 const target=await one('SELECT * FROM members WHERE tenant=? AND id=?',actor.tenant,targetId);
 if(!target)throw new AppError(404,'Dossier introuvable.');
 if(target.id===actor.id)throw new AppError(403,'Vous ne pouvez pas valider votre propre dossier.');
 if(target.suspended||!['pending','otp'].includes(target.status))throw new AppError(409,'Ce dossier ne peut plus être traité. Actualisez la liste.');
 const now=new Date().toISOString(),auditId=id();
 const review={decision:accept?'approved':'rejected',reason,reviewedAt:now,reviewer:actor.id};
 // Compare-and-set inside one transaction: only the winning decision is audited and notified.
 const result=await db().batch([
  statement("UPDATE members SET status=?,profile=json_set(profile,'$.registrationReview',json(?)) WHERE id=? AND tenant=? AND status IN ('pending','otp') AND suspended=0 AND EXISTS (SELECT 1 FROM members a WHERE a.id=? AND a.tenant=? AND a.suspended=0 AND a.status IN ('sympathisant','adherent') AND (a.role='admin' OR (a.reviewRegistrations=1 AND (a.role='cm' OR a.scope IN ('forum','feed','both')))))",accept?'sympathisant':'rejected',JSON.stringify(review),target.id,actor.tenant,actor.id,actor.tenant),
  statement('INSERT INTO audit(id,tenant,actor,action,target,detail,created) SELECT ?,?,?,?,?,?,? WHERE changes()>0',auditId,actor.tenant,actor.id,accept?'dossier_active':'dossier_rejete',target.id,reason,now),
  statement("INSERT INTO records(id,tenant,kind,owner,data,version,updated) SELECT ?,?,'notification',?,?,1,? WHERE EXISTS(SELECT 1 FROM audit WHERE id=?)",id(),actor.tenant,target.id,JSON.stringify({title:accept?'Compte activé':'Inscription refusée',body:accept?'Votre dossier a été validé. Votre espace sympathisant est ouvert. Vous pouvez maintenant déposer votre preuve de paiement d’adhésion.':reason,read:false}),now,auditId),
  statement('DELETE FROM otps WHERE member=?',target.id)
 ]);
 if(!result[0].meta.changes)throw new AppError(409,'Le dossier ou votre autorisation a changé. Actualisez la liste.');
 return {ok:true,message:accept?'Dossier validé et espace activé.':'Inscription refusée. Le candidat peut consulter le motif.'};
}
