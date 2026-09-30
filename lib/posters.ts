import {AppError} from './security';
import {record} from './store';
import {can,type Member} from './domain';
export async function checkedPoster(m:Member,key:string,previous?:any){
 if(!key)return '';
 if(!can(m,'publish'))throw new AppError(403,'La publication d’affiches nécessite une habilitation.');
 const f=await record(m.tenant,key);if(!f||f.kind!=='file'||f.purpose!=='poster'||(f.owner!==m.id&&previous?.poster!==key)||!['image/png','image/jpeg'].includes(f.mime))throw new AppError(403,'Cette affiche ne peut pas être jointe à la publication.');
 if(f.scan!=='clean')throw new AppError(423,'L’affiche attend une analyse de sécurité.');
 return '/api/media/'+key;
}
