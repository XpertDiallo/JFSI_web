import {z} from 'zod';
import {calendarDate} from './domain';

export const HONOUR_CATEGORY='Membre à l’honneur';
const detail=z.string().trim().max(200).default('');
export const honourInput=z.object({
 fullName:z.string().trim().min(3).max(150),
 role:detail, residence:detail, maritalStatus:detail, profession:detail,
 favouriteColour:detail, favouriteDish:detail, motivation:z.string().trim().max(1000).default(''),
 photoCaption:detail,
 joined:z.union([z.literal(''),z.string().regex(/^\d{4}$/).refine(v=>Number(v)>=1900&&Number(v)<=new Date().getUTCFullYear(),'Année d’adhésion invalide.'),calendarDate.refine(v=>v>='1900-01-01'&&v<=new Date().toISOString().slice(0,10),'Date d’adhésion invalide.')]).default(''),
 additionalDescription:z.string().trim().max(5000).default(''),
});
export const publicationInput=z.object({
 title:z.string().trim().min(3).max(150),body:z.string().trim().min(10).max(15000),
 category:z.string().max(80),visibility:z.enum(['public','members','staff']),status:z.enum(['Brouillon','Publié','Archivé']),
 publishAt:z.string().max(30).default(''),sortDate:z.union([calendarDate,z.literal('')]).default(''),
 dateLabel:z.string().max(100).default(''),poster:z.string().max(100).default(''),honour:honourInput.optional(),
}).superRefine((p,c)=>{if(p.category===HONOUR_CATEGORY&&!p.honour)c.addIssue({code:'custom',path:['honour'],message:'Renseignez le portrait du membre mis à l’honneur.'})});
