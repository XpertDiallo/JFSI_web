import {z} from 'zod';
import {duesStatement} from './billing';
export function sixMonthsAfter(value:string){const d=new Date(value),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+6);const end=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,end));return d}
export function marriageEligibility(m:any,payments:any[],s:any,now=new Date()){
 const since=sixMonthsAfter(m.joined),dues=duesStatement(m,payments,s,now);
 return {eligible:!m.suspended&&m.status==='adherent'&&now>=since&&dues.due===0,adherent:m.status==='adherent'&&!m.suspended,seniority:now>=since,availableFrom:since.toISOString().slice(0,10),due:dues.due,message:dues.due>0?'Mettez-vous à jour dans vos cotisations pour bénéficier de ce service':m.status!=='adherent'?'Ce service est réservé aux membres adhérents.':now<since?'Ce service est accessible après six mois d’adhésion.':'Vous pouvez accéder au service Mariage.'};
}
export const marriageOptions={
 age:['18–19 ans','20–24 ans','25–29 ans','30–39 ans','40 ans et plus'],
 situation:['Célibataire (jamais marié·e)','Divorcé·e','Veuf / Veuve'],
 children:['Aucun','Oui, garde exclusive','Oui, garde alternée','Oui, hors du foyer'],
 wish:['Oui','Non','À discuter'],
 salat:['Toujours à l’heure','Régulièrement, parfois en retard','En cours d’apprentissage','À échanger avec l’accompagnateur'],
 mosque:['Autant que possible pour toutes les prières','Principalement vendredi et Ramadan','Occasionnellement','À échanger avec l’accompagnateur'],
 dress:['Jilbab / Abaya','Hijab','Souhaite porter le voile','Ne porte pas le voile','À échanger avec l’accompagnateur'],
 halal:['Strictement halal','Privilégie le halal, flexible à l’extérieur','À échanger avec l’accompagnateur'],
 finances:['Prise en charge du foyer par l’époux','Participation partagée souhaitée','À définir ensemble'],
 mobility:['Ma ville / région actuelle','Partout en Côte d’Ivoire','Autres pays d’Afrique','France / Europe','Canada / États-Unis','Pays musulman','À définir ensemble'],
 work:['Travail à temps plein','Foyer et éducation des enfants','Temps partiel / à domicile','À définir ensemble'],
 union:['Mariage monogame souhaité','Polygamie envisageable, à discuter dans le respect du droit applicable','Polygamie non souhaitée','Sujet à discuter avec l’accompagnateur','Je préfère ne pas préciser'],
 origins:['Côte d’Ivoire','Burkina Faso','Mali','Afrique','France','Europe','États-Unis','Canada','Amérique','Autre','Sans préférence']
} as const;
const safeText=(min:number,max:number)=>z.string().trim().min(min).max(max).refine(v=>!/(https?:\/\/|www\.|@[\w.]|(?:\+?\d[\s().-]*){7,})/i.test(v),'Ne publiez pas de coordonnées ou de lien dans votre profil.');
export const marriageInput=z.object({alias:safeText(2,40),description:safeText(10,200),gender:z.enum(['Homme','Femme']),nationality:safeText(2,70),age:z.enum(marriageOptions.age),situation:z.enum(marriageOptions.situation),children:z.enum(marriageOptions.children),wish:z.enum(marriageOptions.wish),salat:z.enum(marriageOptions.salat),mosque:z.union([z.enum(marriageOptions.mosque),z.literal('')]).default(''),dress:z.union([z.enum(marriageOptions.dress),z.literal('')]).default(''),halal:z.enum(marriageOptions.halal),finances:z.enum(marriageOptions.finances),mobility:z.array(z.enum(marriageOptions.mobility)).min(1).max(7),work:z.enum(marriageOptions.work),union:z.enum(marriageOptions.union),origins:z.array(z.enum(marriageOptions.origins)).min(1).max(11),photo:z.string().min(10).max(100),adult:z.literal(true),noImpediment:z.literal(true),consentStore:z.literal(true),consentDisplay:z.literal(true),consentPhoto:z.literal(true)});
export function marriagePublic(r:any){const p=r.profile;return {id:r.id,alias:p.alias,description:p.description,gender:p.gender,nationality:p.nationality,age:p.age,situation:p.situation,children:p.children,wish:p.wish,salat:p.salat,mosque:p.mosque,dress:p.dress,halal:p.halal,finances:p.finances,mobility:p.mobility,work:p.work,union:p.union,origins:p.origins,photo:'/api/marriage/photo?id='+encodeURIComponent(r.id),demo:r.tenant==='demo'}};
