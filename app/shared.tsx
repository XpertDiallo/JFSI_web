"use client";
import {useState,useEffect,type FormEvent,type ReactNode} from 'react';
import {MessageCircle,Plus} from 'lucide-react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog';
import {labels} from '@/lib/domain';
export type Any=Record<string,any>;
const pending=new Map<string,Promise<any>>();
export async function api(resource:string){if(pending.has(resource))return pending.get(resource)!;const task=fetch('/api/gateway?resource='+resource,{cache:'no-store'}).then(async r=>{const j:any=await r.json();if(!r.ok)throw Error(j.error||'Chargement impossible.');return j}).finally(()=>pending.delete(resource));pending.set(resource,task);return task}
export async function mutate(data:Any){const r=await fetch('/api/gateway',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j:any=await r.json();if(!r.ok)throw Error(j.error||'Enregistrement impossible.');return j}
export function values(e:FormEvent<HTMLFormElement>){e.preventDefault();return Object.fromEntries(new FormData(e.currentTarget).entries()) as Any}
export function Field({label,name,type='text',required=true,value='',wide=false,...props}:Any){return <label className={'form-field '+(wide?'wide':'')}><span>{label}{required?' *':''}</span>{type==='textarea'?<textarea name={name} required={required} defaultValue={value} maxLength={15000} {...props}/>:<input name={name} type={type} required={required} defaultValue={value} maxLength={200} {...props}/>}</label>}
export function Choice({label,name,options,value,required=true}:Any){return <label className="form-field"><span>{label}{required?' *':''}</span><Select name={name} defaultValue={value??(Array.isArray(options[0])?options[0][0]:options[0])} required={required}><SelectTrigger className="choice"><SelectValue/></SelectTrigger><SelectContent>{options.map((o:any)=><SelectItem key={Array.isArray(o)?o[0]:o} value={Array.isArray(o)?o[0]:o}>{Array.isArray(o)?o[1]:o}</SelectItem>)}</SelectContent></Select></label>}
export function Check({name,children,checked=false}:Any){return <label className="check"><Checkbox name={name} defaultChecked={checked} value="yes"/><span>{children}</span></label>}
export function Status({value}:Any){return <span className={'status '+(value==='adherent'||value==='approved'?'status-green':'')}>{labels[value]||value}</span>}
export function Empty({children='Aucun élément pour le moment.'}:Any){return <div className="empty"><BookIcon/>{children}</div>}
export function BookIcon(){return <MessageCircle size={28} className="empty-icon"/>}
export function Modal({title,description,trigger,children}:Any){return <Dialog><DialogTrigger asChild>{trigger||<button className="button"><Plus size={17}/>{title}</button>}</DialogTrigger><DialogContent className="modal"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description||'Les informations sont enregistrées dans votre espace JFSI.'}</DialogDescription></DialogHeader>{children}</DialogContent></Dialog>}
export function Form({children,onSubmit,button='Enregistrer'}:{children:ReactNode,onSubmit:(b:Any)=>Promise<unknown>,button?:string}){const [busy,setBusy]=useState(false),[err,setErr]=useState('');return <form onSubmit={async e=>{const b=values(e);setBusy(true);setErr('');try{await onSubmit(b)}catch(x){setErr((x as Error).message)}finally{setBusy(false)}}}><div className="form-grid">{children}</div>{err&&<p role="alert" className="notice error mt-4">{err}</p>}<button className="button mt-5" disabled={busy}>{busy?'Enregistrement…':button}</button></form>}
export function LinkButton({href,children}:Any){return <a className="button outline" href={href}>{children}</a>}
export function useData(resource:string,rev=0){const [data,setData]=useState<any>(null),[error,setError]=useState('');useEffect(()=>{let alive=true;setError('');api(resource).then(d=>{if(alive)setData(d)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[resource,rev]);return {data,error}}
export function DataState({data,error,children}:Any){if(error)return <div role="alert" className="notice error">{error}</div>;if(!data)return <div role="status" className="notice">Chargement…</div>;return children}
export async function upload(file:File,purpose='proof',extra:Any={}){if(!file?.size)throw Error('Choisissez un fichier.');const form=new FormData();form.append('file',file);form.append('purpose',purpose);Object.entries(extra).forEach(([k,v])=>form.append(k,String(v)));const r=await fetch('/api/upload',{method:'POST',body:form});const j:any=await r.json();if(!r.ok)throw Error(j.error);return j}
