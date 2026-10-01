import {statement} from './store';
import {HONOUR_CATEGORY} from './publication';

const portrait={
 title:'ABOUBAKR SIDDIQ DOUMBIA',category:HONOUR_CATEGORY,
 body:'Adhérent depuis 2014 et Président National du JFSI, Aboubakr Siddiq Doumbia partage un engagement guidé par son amour pour l’islam. Ingénieur d’État et formateur en génie électrique, il est à l’honneur dans ce portrait qui permet de mieux le connaître, au-delà de ses responsabilités associatives.',
 assetKey:'honour-aboubakr-siddiq-doumbia',image:'/api/editorial-image/honour-aboubakr-siddiq-doumbia',alt:'Portrait d’Aboubakr Siddiq Doumbia, Président National JFSI.',
 visibility:'public',status:'Publié',sortDate:'',dateLabel:'',publishAt:'',poster:'',consent:true,
 honour:{fullName:'ABOUBAKR SIDDIQ DOUMBIA',role:'Président National JFSI',residence:'Cocody',maritalStatus:'Célibataire',profession:'Ingénieur d’État / Formateur en génie électrique',favouriteColour:'Bleu et blanc',favouriteDish:'Soupe de carpe',motivation:'L’amour pour l’islam',photoCaption:'Calé',joined:'2014',additionalDescription:''},
};
const initialized=new Set<string>(),inflight=new Map<string,Promise<void>>();
export async function seedHonours(tenant:string){
 if(initialized.has(tenant))return;
 if(inflight.has(tenant))return inflight.get(tenant);
 const task=statement('INSERT OR IGNORE INTO records(id,tenant,kind,owner,data,version,updated) VALUES(?,?,?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data WHERE records.version=1',
  'honour-'+tenant+'-aboubakr-siddiq-doumbia',tenant,'content','editorial',JSON.stringify(portrait),'2026-10-01T12:00:00Z').run().then(()=>{initialized.add(tenant)}).finally(()=>inflight.delete(tenant));
 inflight.set(tenant,task);return task;
}
