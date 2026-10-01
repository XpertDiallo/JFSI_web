"use client";
import {useState} from 'react';
import {Form,Field,Choice,Check,upload,type Any} from './shared';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {HONOUR_CATEGORY} from '@/lib/publication';

export function PublicationForm({content:c={},run,honour=false}:Any){
 const [category,setCategory]=useState(honour?HONOUR_CATEGORY:c.category||'Actualité');
 const isHonour=category===HONOUR_CATEGORY,h=c.honour||{};
 return <Form button="Enregistrer la publication" onSubmit={async b=>{
  if(b.file?.size>5*1024*1024)throw Error('La photo ou l’affiche ne doit pas dépasser 5 Mo.');
  const portrait=isHonour?Object.fromEntries(['fullName','role','residence','maritalStatus','profession','favouriteColour','favouriteDish','motivation','photoCaption','joined','additionalDescription'].map(k=>[k,b['honour_'+k]||''])):undefined;
  const poster=b.file?.size?(await upload(b.file,'poster')).id:c.poster||'';
  return run({action:'content',id:c.id,content:{title:isHonour?portrait!.fullName:b.title,body:b.body,category,visibility:b.visibility,status:b.status,publishAt:b.publishAt||'',sortDate:b.sortDate||'',dateLabel:b.dateLabel||'',poster,honour:portrait},consent:b.consent==='yes'});
 }}>
  {honour?<div className="wide"><span className="tag">{HONOUR_CATEGORY}</span></div>:<label className="form-field"><span>Rubrique *</span><Select value={category} onValueChange={setCategory}><SelectTrigger className="choice"><SelectValue/></SelectTrigger><SelectContent>{['Actualité','Rencontre','Cellule féminine','Projet',HONOUR_CATEGORY,'Information','Message du Président'].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></label>}
  {!isHonour&&<Field label="Titre" name="title" value={c.title} wide maxLength={150}/>}
  {isHonour&&<>
   <Field label="Nom et prénom" name="honour_fullName" value={h.fullName||c.title} wide maxLength={150}/>
   <Field label="Fonction au JFSI" name="honour_role" value={h.role} required={false}/>
   <Field label="Lieu d’habitation (commune ou ville)" name="honour_residence" value={h.residence} required={false}/>
   <Field label="Situation matrimoniale" name="honour_maritalStatus" value={h.maritalStatus} required={false}/>
   <Field label="Profession" name="honour_profession" value={h.profession} required={false}/>
   <Field label="Couleur préférée" name="honour_favouriteColour" value={h.favouriteColour} required={false}/>
   <Field label="Plat préféré" name="honour_favouriteDish" value={h.favouriteDish} required={false}/>
   <Field label="Motivation" name="honour_motivation" value={h.motivation} type="textarea" required={false} maxLength={1000} wide/>
   <Field label="Date ou année d’adhésion" name="honour_joined" value={h.joined} placeholder="2014 ou 2014-06-15" required={false} maxLength={10}/>
   <Field label="Mention photo (facultatif)" name="honour_photoCaption" value={h.photoCaption} required={false}/>
  </>}
  <Field label={isHonour?'Présentation du membre':'Contenu'} name="body" value={c.body} type="textarea" wide minLength={10}/>
  {isHonour&&<Field label="Description supplémentaire (facultatif)" name="honour_additionalDescription" type="textarea" value={h.additionalDescription} required={false} maxLength={5000} wide/>}
  {c.image&&<div className="wide"><p className="hint">Photo ou affiche actuelle. Sans nouveau fichier, elle sera conservée.</p><img src={c.image} alt="Illustration actuelle de la publication" className="publication-current-image"/></div>}
  <Field label={isHonour?'Photo du membre (facultatif · JPG ou PNG · 5 Mo maximum)':'Affiche illustrative (facultatif · JPG ou PNG · 5 Mo maximum)'} name="file" type="file" accept="image/jpeg,image/png" required={false} wide/>
  <Choice label="Visibilité" name="visibility" value={c.visibility||'public'} options={[["public","Public"],["members","Membres"],["staff","Responsables"]]}/>
  <Choice label="État" name="status" value={c.status||'Brouillon'} options={['Brouillon','Publié','Archivé']}/>
  {!isHonour&&<><Field label="Date de l’événement (facultatif)" name="sortDate" type="date" value={c.sortDate} required={false}/><Field label="Date affichée si incomplète (facultatif)" name="dateLabel" value={c.dateLabel} required={false}/></>}
  <Field label="Publication programmée (facultatif)" name="publishAt" type="datetime-local" value={c.publishAt} required={false}/>
  {isHonour&&<div className="wide"><Check name="consent" checked={c.consent}>Le membre a accepté la publication de ce portrait, de ses informations et, le cas échéant, de sa photo.</Check></div>}
 </Form>;
}

export function HonourPortrait({record:r}:Any){
 const h=r.honour;
 const details=h?[["Lieu d’habitation",h.residence],["Situation matrimoniale",h.maritalStatus],["Profession",h.profession],["Couleur préférée",h.favouriteColour],["Plat préféré",h.favouriteDish],["Adhésion au JFSI",h.joined]]:[];
 return <div className="honour-portrait"><div className="honour-visual">{r.image?<figure><img src={r.image} alt={r.alt||'Portrait de '+r.title} loading="lazy"/>{h?.photoCaption&&<figcaption>{h.photoCaption}</figcaption>}</figure>:<div className="honour-monogram" aria-hidden="true">{r.title.trim().split(/\s+/).slice(0,2).map((s:string)=>s[0]).join('')}</div>}</div><div className="honour-details">{h?.role&&<p className="honour-role">{h.role}</p>}<p className="pre-line">{r.body}</p><dl>{details.filter(([,v])=>v).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{h?.motivation&&<blockquote><span>Sa motivation</span><p>{h.motivation}</p></blockquote>}{h?.additionalDescription&&<div className="honour-more"><h3>Pour mieux le connaître</h3><p className="pre-line">{h.additionalDescription}</p></div>}</div></div>;
}
