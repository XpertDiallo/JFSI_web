import {AppError} from './security';
import {db,rows,statement} from './store';
import {active,type Member} from './domain';

export const REACTION_TYPES=['like','love','applause','compassion','sad','cry'] as const;
export type ReactionType=typeof REACTION_TYPES[number];
type Viewer={tenant:string;member:Member|null;mfa:boolean};
type Entry={id:string;tenant:string;kind:string;owner:string;version:number;data:string;[key:string]:any};
type Summary={counts:Record<ReactionType,number>;total:number;mine:ReactionType|null};
const targetPattern=/^[A-Za-z0-9:_-]{1,160}$/;
const staff=['admin','accountant','cm','auditor'];
const zero=():Summary=>({counts:{like:0,love:0,applause:0,compassion:0,sad:0,cry:0},total:0,mine:null});
const placeholders=(n:number)=>Array(n).fill('?').join(',');

export function reactionTargets(value:unknown):string[]{
 if(typeof value!=='string'||value.length>13000)throw new AppError(400,'Liste de publications invalide.');
 if(!value)return [];
 const parts=value.split(',');
 if(parts.length>80||parts.some(p=>!targetPattern.test(p)))throw new AppError(400,'Choisissez au maximum 80 publications valides.');
 return [...new Set(parts)];
}
const unpack=(r:any):Entry=>({...JSON.parse(r.data),...r});
// Record metadata is authoritative; publication fields cannot override its tenant or owner.
const fields=(r:Entry)=>JSON.parse(r.data);
function readable(r:Entry,c:Viewer,now:number):boolean{
 const d=fields(r);
 if(r.tenant!==c.tenant||!['content','event','topic','reply'].includes(r.kind)||d.hidden||d.deleted||['Brouillon','Archivé'].includes(d.status))return false;
 if(d.publishAt&&(!Number.isFinite(Date.parse(d.publishAt))||Date.parse(d.publishAt)>now))return false;
 if((r.kind==='topic'||r.kind==='reply')&&!active(c.member))return false;
 if(d.visibility==='public'&&r.kind!=='topic'&&r.kind!=='reply')return true;
 if(!active(c.member)||c.member!.tenant!==c.tenant)return false;
 if(d.visibility==='staff')return staff.includes(c.member!.role)&&c.mfa;
 return d.visibility===undefined||d.visibility===''||d.visibility==='members'||d.visibility==='public';
}

async function allowed(c:Viewer,targets:string[],now=Date.now()){
 const found=targets.length?(await rows(`SELECT * FROM records WHERE tenant=? AND id IN (${placeholders(targets.length)})`,c.tenant,...targets)).map(unpack):[];
 const parentIds=[...new Set(found.filter(r=>r.kind==='reply').map(r=>fields(r).topic).filter(v=>typeof v==='string'&&targetPattern.test(v)))];
 const parents=parentIds.length?(await rows(`SELECT * FROM records WHERE tenant=? AND kind='topic' AND id IN (${placeholders(parentIds.length)})`,c.tenant,...parentIds)).map(unpack):[];
 const parentMap=new Map(parents.map(r=>[r.id,r]));
 const visible=found.filter(r=>readable(r,c,now)&&(r.kind!=='reply'||!!parentMap.get(fields(r).topic)&&readable(parentMap.get(fields(r).topic)!,c,now)));
 return {visible,parentMap};
}

export async function reactionSummaries(c:Viewer,requested:unknown){
 const ids=Array.isArray(requested)?reactionTargets(requested.join(',')):reactionTargets(requested);
 const {visible}=await allowed(c,ids);
 const summaries:Record<string,Summary>={};
 for(const r of visible)summaries[r.id]=zero();
 if(visible.length){
  const targetIds=visible.map(r=>r.id);
  // A legacy target-only record counts as a like. Rank duplicate historical rows
  // once per member/publication, without returning an identity to the browser.
  const grouped=await rows(`WITH normalized AS (
   SELECT id,owner,updated,version,json_extract(data,'$.target') AS target,
    CASE WHEN json_type(data,'$.reaction') IS NULL THEN 'like' ELSE json_extract(data,'$.reaction') END AS reaction
   FROM records WHERE tenant=? AND kind='reaction' AND json_extract(data,'$.target') IN (${placeholders(targetIds.length)})
  ), ranked AS (
   SELECT *,ROW_NUMBER() OVER(PARTITION BY owner,target ORDER BY updated DESC,version DESC,id DESC) AS rank FROM normalized
   WHERE reaction IN ('like','love','applause','compassion','sad','cry')
  ) SELECT target,reaction,COUNT(*) AS amount,MAX(CASE WHEN owner=? THEN 1 ELSE 0 END) AS mine
   FROM ranked WHERE rank=1 GROUP BY target,reaction`,c.tenant,...targetIds,active(c.member)?c.member!.id:'');
  for(const g of grouped){const s=summaries[g.target];if(!s||!REACTION_TYPES.includes(g.reaction))continue;s.counts[g.reaction as ReactionType]=Number(g.amount);s.total+=Number(g.amount);if(g.mine===1&&active(c.member))s.mine=g.reaction;}
 }
 return {summaries,canReact:active(c.member)&&c.member!.tenant===c.tenant};
}

export async function saveReaction(c:Viewer,input:{target?:unknown;reaction?:unknown}){
 const m=c.member;if(!active(m)||!m||m.tenant!==c.tenant)throw new AppError(403,'Votre compte doit être activé pour réagir.');
 const ids=reactionTargets(typeof input.target==='string'?input.target:'');
 if(ids.length!==1)throw new AppError(400,'Publication invalide.');
 const reaction=input.reaction;
 if(reaction!==null&&!REACTION_TYPES.includes(reaction as ReactionType))throw new AppError(400,'Choisissez une réaction valide ou retirez votre réaction.');
 const {visible,parentMap}=await allowed(c,ids);
 const target=visible[0];if(!target)throw new AppError(404,'Cette publication n’est pas disponible.');
 const parent=target.kind==='reply'?parentMap.get(fields(target).topic):null;
 const guard='EXISTS(SELECT 1 FROM records WHERE tenant=? AND id=? AND version=?)'+(parent?' AND EXISTS(SELECT 1 FROM records WHERE tenant=? AND id=? AND version=?)':'')+" AND EXISTS(SELECT 1 FROM members WHERE tenant=? AND id=? AND suspended=0 AND status IN ('sympathisant','adherent'))";
 const guardedValues=[c.tenant,target.id,target.version,...(parent?[c.tenant,parent.id,parent.version]:[]),c.tenant,m.id];
 const key='reaction:'+c.tenant+':'+m.id+':'+target.id;
 const now=new Date().toISOString();
 const operations=[statement(`DELETE FROM records WHERE tenant=? AND kind='reaction' AND owner=? AND json_extract(data,'$.target')=?${reaction===null?'':' AND id<>?'} AND ${guard}`,c.tenant,m.id,target.id,...(reaction===null?[]:[key]),...guardedValues)];
 if(reaction!==null)operations.push(statement(`INSERT INTO records(id,tenant,kind,owner,data,version,updated)
  SELECT ?,?,'reaction',?,?,1,? WHERE ${guard}
  ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=records.version+1,updated=excluded.updated
  WHERE records.tenant=excluded.tenant AND records.owner=excluded.owner AND records.kind='reaction'`,key,c.tenant,m.id,JSON.stringify({target:target.id,reaction}),now,...guardedValues));
 operations.push(statement(`SELECT 1 AS available WHERE ${guard}`,...guardedValues));
 // D1 batches are transactional. The deterministic key makes retries and
 // simultaneous requests retain exactly one reaction per person/publication.
 const result=await db().batch(operations);
 if(!result[result.length-1].results?.length)throw new AppError(409,'Cette publication a changé. Actualisez avant de réessayer.');
 return reactionSummaries(c,[target.id]);
}
