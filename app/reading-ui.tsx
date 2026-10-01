"use client";
import {useEffect,useRef,useState} from 'react';
import {BookOpen,Images,Play,FileText,Headphones,Search} from 'lucide-react';
import {DataState,Empty,Modal,useData,Form,Field,Choice,Check,upload,type Any} from './shared';
import {FilterSelect} from './pro-tools';
import {PageTurnSurface} from './reader-navigation';
import {resolvePageTurn,type PageDirection} from '../lib/reader-navigation';
import './reader-navigation.css';
const categories=['Coran & Tafsir','Hadith & Sounna','Fiqh & Jurisprudence','Spiritualité & Croyance','Éducation & Famille','Histoire & Biographies','Jeunesse & Enfants','Leadership & Développement personnel'];
const searchable=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
const mediaCategories=['Image','Vidéo','Audio','PDF','Document','Affiche','Logo','Bannière'];
export default function ReadingCatalogue({collection,rev=0}:Any){const {data,error}=useData('catalogue&collection='+collection,rev);const [query,setQuery]=useState(''),[category,setCategory]=useState('all'),[language,setLanguage]=useState('all'),[format,setFormat]=useState('all'),[cataloguePage,setCataloguePage]=useState(1);useEffect(()=>setCataloguePage(1),[query,category,language,format]);const library=collection==='bibliotheque';const selected=(data||[]).filter((r:Any)=>(category==='all'||r.category===category)&&(format==='all'||r.format===format)&&(language==='all'||r.language===language)&&searchable(r.title+' '+r.author+' '+r.description).includes(searchable(query)));return <><section className="reading-hero"><span className="eyebrow">SAVOIR · CULTURE · PARTAGE</span><h2>{library?'Ouvrages et livres islamiques en ligne':'Photos, vidéos et documents du JFSI'}</h2><p>{library?'Une collection pour apprendre, réfléchir et nourrir sa foi. Ouvrez un ouvrage pour le lire directement ici.':'Retrouvez les ressources de l’association et consultez-les directement dans votre navigateur.'}</p></section><div className="toolbar reading-filters"><label className="filter-search"><span>Rechercher</span><input placeholder={library?'Un livre, un auteur, un sujet…':'Une ressource, une activité…'} value={query} onChange={e=>setQuery(e.target.value)}/></label><FilterSelect label="Catégorie" value={category} setValue={setCategory} options={[["all","Toutes les catégories"],...(library?categories:mediaCategories).map(x=>[x,x])]}/>{library&&<FilterSelect label="Langue" value={language} setValue={setLanguage} options={[["all","Toutes les langues"],...[...new Set((data||[]).map((r:Any)=>r.language))].map(l=>[l,l])]}/>}</div>{!library&&<div className="filter-chips">{[['all','Tous'],['image','Images'],['video','Vidéos'],['audio','Audios'],['pdf','PDF']].map(([v,l])=><button key={v} className={'button '+(format===v?'':'outline')} aria-pressed={format===v} onClick={()=>setFormat(v)}>{l}</button>)}</div>}<DataState data={data} error={error}><div className="section-heading"><h2>{library?'Tous les ouvrages':'Toutes les ressources'}</h2><span>{selected.length} résultat(s)</span></div><div className="catalogue-grid">{selected.slice((cataloguePage-1)*12,cataloguePage*12).map((r:Any)=><article className="panel reading-card" key={r.id}>{r.cover||r.format==='image'?<img src={r.cover||r.url} alt={r.title} loading="lazy" decoding="async" draggable={false}/>:<div className="reading-cover">{['pdf','pages'].includes(r.format)?<BookOpen size={50}/>:r.format==='video'?<Play size={50}/>:<Headphones size={50}/>}<span>{r.format.toUpperCase()}</span></div>}<div className="pad"><span className="tag">{r.category}</span><h3>{r.title}</h3><p className="muted">{r.author? r.author+' · ':''}{r.language}</p><p className="clamp-three">{r.description}</p><Modal title={r.title} description={r.source||'Ressource JFSI'} trigger={<button className="button">{['pdf','pages'].includes(r.format)?'Lire l’ouvrage':r.format==='audio'?'Écouter':r.format==='video'?'Regarder':'Consulter'}</button>}><Reader item={r}/></Modal></div></article>)}</div>{selected.length>12&&<nav className="reader-controls catalogue-pages" aria-label="Pages du catalogue"><button className="button outline" disabled={cataloguePage===1} onClick={()=>setCataloguePage(p=>p-1)}>Précédent</button><span>Page {cataloguePage} / {Math.ceil(selected.length/12)}</span><button className="button outline" disabled={cataloguePage>=Math.ceil(selected.length/12)} onClick={()=>setCataloguePage(p=>p+1)}>Suivant</button></nav>}{!selected.length&&<Empty><strong>{data?.length?'Aucun résultat pour ces filtres.':'Les premiers ouvrages seront bientôt disponibles.'}</strong><p>{data?.length?'Essayez un autre mot-clé ou réinitialisez les filtres.':'Les responsables pourront publier ici les ouvrages autorisés à la consultation.'}</p><button className="button outline" onClick={()=>{setQuery('');setCategory('all');setLanguage('all');setFormat('all')}}>Réinitialiser les filtres</button></Empty>}</DataState></>}
export function Reader({item}:Any){return <div className="inline-reader" onContextMenu={e=>e.preventDefault()}>{item.format==='pages'?<PageReader item={item}/>:item.format==='pdf'?<SectionReader item={item}/>:item.format==='video'?<video aria-label={item.title} controls controlsList="nodownload noremoteplayback" disablePictureInPicture preload="metadata" src={item.url}/>:item.format==='audio'?<audio aria-label={item.title} controls controlsList="nodownload" preload="metadata" src={item.url}/>:<img src={item.url} alt={item.title} draggable={false}/>}<p className="field-note">Consultation en ligne · {item.author||'JFSI'}</p></div>}
function PdfReader({url,offset=0,totalPages=0,initialPage=1,previousSection,nextSection}:Any){
  const canvas=useRef<HTMLCanvasElement>(null),layer=useRef<HTMLDivElement>(null),scroll=useRef<HTMLDivElement>(null);
  const [loaded,setLoaded]=useState<{source:string;pdf:any}|null>(null),[page,setPage]=useState(1),[zoom,setZoom]=useState(1),[error,setError]=useState(''),[busy,setBusy]=useState(true),[width,setWidth]=useState(600);
  const pdf=loaded&&loaded.source===url?loaded.pdf:null;
  useEffect(()=>{
    const element=scroll.current;if(!element)return;
    const resize=new ResizeObserver(entries=>{const value=Math.floor(entries[0].contentRect.width);if(value>0)setWidth(value)});
    resize.observe(element);return()=>resize.disconnect();
  },[]);
  useEffect(()=>{
    let cancelled=false,task:any;setLoaded(null);setError('');setBusy(true);
    import('pdfjs-dist').then(lib=>{
      if(cancelled)return;lib.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.mjs';
      task=lib.getDocument({url,disableFontFace:false});return task.promise;
    }).then(doc=>{if(doc&&!cancelled){setPage(Math.max(1,Math.min(initialPage,doc.numPages)));setLoaded({source:url,pdf:doc})}})
      .catch(()=>{if(!cancelled){setError('Ce document ne peut pas être affiché. Contactez les responsables.');setBusy(false)}});
    return()=>{cancelled=true;task?.destroy()};
  },[url,initialPage]);
  useEffect(()=>{
    if(!pdf)return;let cancelled=false,render:any,textLayer:any;setBusy(true);setError('');
    (async()=>{
      const p=await pdf.getPage(page);if(cancelled||!canvas.current||!layer.current)return;
      const viewport=p.getViewport({scale:Math.max(.25,(width-12)/p.getViewport({scale:1}).width)*zoom});
      const c=canvas.current,target=layer.current;c.width=viewport.width;c.height=viewport.height;
      target.replaceChildren();target.style.setProperty('--scale-factor',String(viewport.scale));
      render=p.render({canvas:c,canvasContext:c.getContext('2d')!,viewport});await render.promise;if(cancelled)return;
      const lib=await import('pdfjs-dist'),text=await p.getTextContent();if(cancelled)return;
      textLayer=new lib.TextLayer({textContentSource:text,container:target,viewport});await textLayer.render();
      if(!cancelled)setBusy(false);
    })().catch(e=>{if(!cancelled&&e?.name!=='RenderingCancelledException'){setError('Lecture de cette page impossible.');setBusy(false)}});
    return()=>{cancelled=true;render?.cancel();textLayer?.cancel()};
  },[pdf,page,zoom,width]);
  const previous=!!pdf&&(page>1||!!previousSection),next=!!pdf&&(page<pdf.numPages||!!nextSection);
  function turn(direction:PageDirection){
    if(!pdf||busy)return;
    const target=resolvePageTurn(page,pdf.numPages,direction,!!(direction===-1?previousSection:nextSection));
    if(target===null)return;setBusy(true);scroll.current?.scrollTo({top:0,left:0});
    if(target==='previous-section')previousSection();else if(target==='next-section')nextSection();else setPage(target);
  }
  return <><div className="reader-controls">
    <button className="button outline" disabled={!previous||busy} onClick={()=>turn(-1)}>Précédent</button>
    <span aria-live="polite">Page {offset+page} / {totalPages||pdf?.numPages||'…'}</span>
    <button className="button outline" disabled={!next||busy} onClick={()=>turn(1)}>Suivant</button>
    <button aria-label="Réduire le zoom" className="button outline" disabled={zoom<=.75||busy} onClick={()=>setZoom(z=>z-.25)}>−</button>
    <button aria-label="Agrandir le zoom" className="button outline" disabled={zoom>=2||busy} onClick={()=>setZoom(z=>z+.25)}>+</button>
  </div>{busy&&!error&&<p role="status">Chargement de la page…</p>}{error&&<p className="notice error" role="alert">{error}</p>}
  <PageTurnSurface label={'Livre, page '+(offset+page)} ready={!!pdf&&!busy} zoomed={zoom>1} previous={previous} next={next} turn={turn}>
    <div className="pdf-scroll" ref={scroll}><div className="pdf-page"><canvas ref={canvas} aria-hidden="true"/><div ref={layer} className="textLayer" role="document" aria-label={'Texte de la page '+(offset+page)}/></div></div>
  </PageTurnSurface></>;
}
export function ReadingManagement({run,rev,ctx}:Any){const {data,error}=useData('catalogue-management',rev);const [collection,setCollection]=useState('bibliotheque');return <><section className="panel pad"><h2>Bibliothèque et médiathèque</h2><p>Ajoutez uniquement des contenus que le JFSI est autorisé à diffuser. Les lecteurs restent intégrés au site.</p><FilterSelect label="Collection" value={collection} setValue={setCollection} options={[["bibliotheque","Bibliothèque islamique"],["mediatheque","Médiathèque"]]}/><ReadingForm key={collection} {...{collection,run,ctx}}/></section><DataState data={data} error={error}><div className="rows mt-6">{data?.map((r:Any)=><div className="panel pad" key={r.id}><h3>{r.title}</h3><p>{r.collection==='bibliotheque'?'Bibliothèque':'Médiathèque'} · {r.status} · {r.visibility}</p><Modal title="Modifier cette ressource" trigger={<button className="button outline">Modifier / archiver</button>}><ReadingForm collection={r.collection} item={r} run={run} ctx={ctx}/></Modal></div>)}</div></DataState></>}
function ReadingForm({collection,item={},run,ctx}:Any){return <Form button="Enregistrer la ressource" onSubmit={async b=>{const file=b.file?.size?(await upload(b.file,'reading')).id:item.file;await run({action:'collection',id:item.id,item:{...b,collection,file,rights:b.rights==='yes',publishAt:b.publishAt?new Date(b.publishAt).toISOString():''}})}}><Field label="Titre" name="title" value={item.title}/><Field label="Auteur / association" name="author" value={item.author||'JFSI'}/><Choice label="Catégorie" name="category" value={item.category} options={collection==='bibliotheque'?categories:mediaCategories}/><Field label="Langue" name="language" value={item.language||'Français'}/><Field label="Description ou transcription courte" name="description" type="textarea" value={item.description} required={false} wide maxLength={2000}/><Field label="Source et autorisation / licence" name="source" value={item.source} wide/><Field label={'Fichier · '+ctx.settings.uploadMB+' Mo maximum'+(item.id?' (facultatif pour conserver le fichier)':'')} name="file" type="file" accept={collection==='bibliotheque'?'.pdf':'.pdf,.jpg,.jpeg,.png,.mp4,.webm,.mp3'} required={!item.id} wide/><Choice label="Visibilité" name="visibility" value={item.visibility||'public'} options={[["public","Public"],["members","Membres"],["staff","Responsables de publication"]]}/><Choice label="État" name="status" value={item.status||'Brouillon'} options={['Brouillon','Publié','Archivé']}/><Field label="Publication programmée (facultative)" name="publishAt" type="datetime-local" value={item.publishAt?.slice(0,16)} required={false}/><div className="wide"><Check name="rights" checked={item.rights}>Le JFSI dispose de l’autorisation de diffuser ce contenu et les personnes identifiables ont consenti à sa publication.</Check></div></Form>}


function SectionReader({item}:Any){
  const [position,setPosition]=useState({section:0,page:1});const current=item.parts?.[position.section];
  function changeSection(section:number,last=false){const part=item.parts?.[section];if(part)setPosition({section,page:last?part.pages:1})}
  return <>{item.parts?.length>1&&<div className="mb-5"><FilterSelect label="Section de lecture" value={String(position.section)} setValue={(value:string)=>changeSection(Number(value))} options={item.parts.map((p:Any,i:number)=>[String(i),'Pages '+p.startPage+' à '+(p.startPage+p.pages-1)])}/><p className="field-note">Les sections suivantes se chargent au fil de votre lecture.</p></div>}
    <PdfReader url={current?.url||item.url} offset={current?current.startPage-1:0} totalPages={item.pages||0} initialPage={position.page}
      previousSection={position.section>0?()=>changeSection(position.section-1,true):undefined}
      nextSection={position.section<(item.parts?.length||1)-1?()=>changeSection(position.section+1):undefined}/></>;
}
function PageReader({item}:Any){
  const [page,setPage]=useState(1),[zoom,setZoom]=useState(100),[error,setError]=useState(false),[busy,setBusy]=useState(true),[texts,setTexts]=useState<Any>({}),[showText,setShowText]=useState(false);
  const scroll=useRef<HTMLDivElement>(null);
  useEffect(()=>{const controller=new AbortController();fetch(item.pageBase+'text.json',{signal:controller.signal}).then(r=>r.ok?r.json():{}).then(t=>setTexts(t as Any)).catch(()=>{});return()=>controller.abort()},[item.pageBase]);
  function goTo(n:number){if(n===page)return;setError(false);setBusy(true);setPage(n);scroll.current?.scrollTo({top:0,left:0})}
  function turn(direction:PageDirection){if(busy)return;const target=resolvePageTurn(page,item.pages,direction);if(typeof target==='number')goTo(target)}
  return <><div className="reader-controls">
    <button className="button outline" disabled={page<=1||busy} onClick={()=>turn(-1)}>Précédent</button>
    <label className="page-jump">Page <input type="number" min={1} max={item.pages} value={page} aria-label="Page de lecture" onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=item.pages)goTo(n)}}/> / {item.pages}</label>
    <button className="button outline" disabled={page>=item.pages||busy} onClick={()=>turn(1)}>Suivant</button>
    <button className="button outline" aria-label="Réduire le zoom" disabled={zoom<=100} onClick={()=>setZoom(z=>z-25)}>−</button>
    <button className="button outline" aria-label="Agrandir le zoom" disabled={zoom>=250} onClick={()=>setZoom(z=>z+25)}>+</button>
  </div><span className="sr-only" aria-live="polite">Page {page} sur {item.pages}</span>
  {busy&&!error&&<p role="status">Chargement de la page…</p>}{error&&<p role="alert" className="notice error">Page momentanément indisponible.</p>}
  <PageTurnSurface label={item.title+' — page '+page} ready={!busy} zoomed={zoom>100} previous={page>1} next={page<item.pages} turn={turn}>
    <div className="page-image-scroll" ref={scroll}><img key={page} style={{width:zoom+'%',maxWidth:'none',maxHeight:'none'}} src={item.pageBase+'page-'+String(page).padStart(4,'0')+'.webp'} alt={item.title+' — page '+page} draggable={false} onLoad={()=>setBusy(false)} onError={()=>{setError(true);setBusy(false)}}/></div>
  </PageTurnSurface>{texts[String(page)]&&<><button className="text-link mt-3" onClick={()=>setShowText(v=>!v)}>{showText?'Masquer':'Afficher'} le texte de cette page</button>{showText&&<div className="panel pad pre-line" role="document">{texts[String(page)]}</div>}</>}</>;
}
