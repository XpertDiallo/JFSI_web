import {env} from 'cloudflare:workers';
import portraits from '@/.sites-private/demo-assets';
import {db,one,statement} from './store';
export async function seedMarriageDemo(){if(await one('SELECT id FROM claims WHERE id=?','marriage-demo-v1'))return;const now=new Date(),current=now.toISOString().slice(0,7),writes=[];
 for(const [owner,alias,gender,image]of [['demo-membre','Ibrahim · démo','Homme','man'],['demo-moderateur','Aminata · démo','Femme','woman']]){
  writes.push(statement("UPDATE members SET joined='2026-01-15T12:00:00Z' WHERE id=?",owner));
  const file='demo-photo-'+image;if(!portraits[image]||!env.BUCKET)continue;await env.BUCKET.put('demo/'+file,Uint8Array.from(atob(portraits[image]),c=>c.charCodeAt(0)),{httpMetadata:{contentType:'image/png'}});
  const add=(kind:string,key:string,data:any)=>writes.push(statement('INSERT OR IGNORE INTO records(id,tenant,kind,owner,data,version,updated) VALUES(?,?,?,?,?,1,?)',key,'demo',kind,owner,JSON.stringify(data),now.toISOString()));
  add('file',file,{purpose:'marriage_photo',mime:'image/png',name:'Portrait fictif généré',scan:'clean',size:portraits[image].length});
  const profile={alias,description:'Personne entièrement fictive pour découvrir le service Mariage et son accompagnement.',gender,nationality:'Côte d’Ivoire',age:'30–39 ans',situation:'Célibataire (jamais marié·e)',children:'Aucun',wish:'À discuter',salat:'Régulièrement, parfois en retard',mosque:gender==='Homme'?'Occasionnellement':'',dress:gender==='Femme'?'Hijab':'',halal:'Strictement halal',finances:'À définir ensemble',mobility:['Partout en Côte d’Ivoire'],work:'À définir ensemble',union:'Mariage monogame souhaité',origins:['Sans préférence'],photo:file,adult:true,noImpediment:true,consentStore:true,consentDisplay:true,consentPhoto:true};
  add('marriage','marriage:demo:'+owner,{profile,status:'Approuvé',reason:'Démonstration fictive prévalidée',consentVersion:'demo',consentedAt:now.toISOString()});
  const payment=(type:string,period:string,amount:number)=>add('payment','demo-history:'+owner+':'+type+':'+period,{type,period,amount,memberName:alias,operator:'Démonstration',reference:'DEMO',date:period+'-15T12:00',status:'approved',approvedAt:period+'-15T12:00:00Z',receipt:'DEMO-'+owner+'-'+period,proof:'',historical:true});
  payment('adhesion','2026-01',2500);for(let month=1;month<=12;month++){const period='2026-'+String(month).padStart(2,'0');if(period<=current)payment('cotisation',period,500)}
 }
 writes.push(statement('INSERT OR IGNORE INTO claims(id,value) VALUES(?,?)','marriage-demo-v1',now.toISOString()));await db().batch(writes);
}
