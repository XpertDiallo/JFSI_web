'use client';
import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {ThumbsUp} from 'lucide-react';

const options=[['like','J’aime',''],['love','Cœur','❤️'],['applause','Applaudissements','👏'],['compassion','Compassion','🫂'],['sad','Tristesse','😔'],['cry','Pleurs','😢']] as const;
type Reaction=typeof options[number][0];
type Summary={counts:Record<Reaction,number>;mine:Reaction|null;total:number};
type Result={summaries:Record<string,Summary>;canReact:boolean};
type ReactionState=Result&{loading:boolean;error:string;refresh:()=>void;set:(target:string,reaction:Reaction|null)=>Promise<void>};
const ReactionContext=createContext<ReactionState|null>(null);
const blank={summaries:{},canReact:false};

async function answer(response:Response):Promise<Result>{const result=await response.json() as Result&{error?:string};if(!response.ok)throw new Error(result.error||'Les réactions ne sont pas disponibles.');return result;}
export function ReactionProvider({targets,revision,children}:{targets:string[];revision?:string|number;children:ReactNode}){
 const signature=[...new Set(targets)].sort().join(',');
 const [state,setState]=useState<Result>(blank),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let current=true;
  setLoading(true);setError('');setState(blank);
  const ids=signature?signature.split(','):[];
  const batches=Array.from({length:Math.ceil(ids.length/80)},(_,i)=>ids.slice(i*80,(i+1)*80));
  Promise.all(batches.map(batch=>fetch('/api/gateway?resource=reactions&targets='+encodeURIComponent(batch.join(',')),{signal:controller.signal,cache:'no-store'}).then(answer)))
   .then(results=>{if(current)setState({summaries:Object.assign({},...results.map(r=>r.summaries)),canReact:results.some(r=>r.canReact)});})
   .catch(e=>{if(current&&e.name!=='AbortError')setError(e.message);}).finally(()=>{if(current)setLoading(false);});
  return()=>{current=false;controller.abort();};
 },[signature,revision,reload]);
 const value=useMemo(()=>({...state,loading,error,refresh:()=>setReload(n=>n+1),set:async(target:string,reaction:Reaction|null)=>{
  const result=await answer(await fetch('/api/gateway',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reaction',target,reaction})}));
  setState(s=>({...s,summaries:{...s.summaries,...result.summaries},canReact:result.canReact}));
 }}),[state,loading,error]);
 return <ReactionContext.Provider value={value}>{children}</ReactionContext.Provider>;
}

export function ReactionBar({target}:{target:string}){
 const data=useContext(ReactionContext);const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!data)return null;
 const summary=data.summaries[target];
 if(!summary&&!data.loading&&!data.error)return null;
 async function select(reaction:Reaction){if(!data||!summary||busy)return;setBusy(true);setError('');try{await data.set(target,summary.mine===reaction?null:reaction);}catch(e){setError(e instanceof Error?e.message:'Réaction non enregistrée.');}finally{setBusy(false);}}
 return <div className="reactions-block" aria-busy={busy||data.loading}>
  <div className="publication-reactions" role="group" aria-label="Réactions à la publication">
   {options.map(([key,label,emoji])=><button key={key} type="button" className={'reaction-button'+(summary?.mine===key?' selected':'')} aria-label={label+' : '+(summary?.counts[key]||0)+(summary?.mine===key?', votre réaction':'')} aria-pressed={summary?.mine===key} title={data.canReact?label+(summary?.mine===key?' — cliquer pour retirer':''):'Connectez-vous avec un compte activé pour réagir'} disabled={!data.canReact||data.loading||busy||!!data.error} onClick={()=>void select(key)}>
    {key==='like'?<ThumbsUp size={18} color="#2563eb" fill={summary?.mine===key?'#bfdbfe':'none'} aria-hidden="true"/>:<span aria-hidden="true">{emoji}</span>}<span>{summary?.counts[key]||0}</span>
   </button>)}
  </div>
  {data.error&&<p className="reaction-feedback" role="status">{data.error} <button type="button" onClick={data.refresh}>Réessayer</button></p>}
  {error&&<p className="reaction-feedback" role="alert">{error}</p>}
  {!data.loading&&!data.error&&!data.canReact&&<small className="muted"><a href="/espace">Connectez-vous</a> avec un compte activé pour réagir.</small>}
 </div>;
}
