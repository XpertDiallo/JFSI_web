"""Prepare user-provided PDFs for on-demand browser reading; preserve originals."""
from pathlib import Path
from zipfile import ZipFile
import hashlib,json,re,unicodedata,sys
import pymupdf as fitz
root=Path(__file__).resolve().parents[1]
archive=Path(sys.argv[1]) if len(sys.argv)>1 else root/'resources-private'/'Pack islamique Livres et leadership.zip'
originals=root/'resources-private'/'library-originals';originals.mkdir(parents=True,exist_ok=True)
public=root/'public'/'books';public.mkdir(parents=True,exist_ok=True)
work=root/'work'/'books';work.mkdir(parents=True,exist_ok=True)
manifest=[];seen={};duplicates=[];errors=[]
def category(title):
 t=unicodedata.normalize('NFKD',title).encode('ascii','ignore').decode().lower()
 if any(x in t for x in ['riche','pauvre','leadership']):return 'Leadership & Développement personnel'
 if any(x in t for x in ['enfant','eduque']):return 'Jeunesse & Enfants'
 if any(x in t for x in ['coran','tajweed','memorisa','tafs','arabe']):return 'Coran & Tafsir'
 if any(x in t for x in ['sahih','hadith','vertueux']):return 'Hadith & Sounna'
 if any(x in t for x in ['femme','epous','mari','foyer','mere','soeur']):return 'Éducation & Famille'
 if any(x in t for x in ['muhammad','prophet','sahab','aisha','predecesseurs','nations']):return 'Histoire & Biographies'
 if any(x in t for x in ['priere','jeune','pelerin','adoration','jilbab']):return 'Fiqh & Jurisprudence'
 return 'Spiritualité & Croyance'
with ZipFile(archive) as z:
 for index,info in enumerate(z.infolist()):
  if info.is_dir() or not info.filename.lower().endswith('.pdf'):continue
  data=z.read(info);sha=hashlib.sha256(data).hexdigest()
  if sha in seen:duplicates.append({'file':info.filename,'sameAs':seen[sha]});continue
  seen[sha]=info.filename;key='livre-'+sha[:16];folder=public/key;folder.mkdir(exist_ok=True)
  original=originals/(key+'.pdf');original.write_bytes(data)
  try:
   doc=fitz.open(stream=data,filetype='pdf')
   if doc.needs_pass:raise ValueError('PDF protégé par mot de passe')
   pages=len(doc)
   # Copy pages into a fresh PDF to omit embedded actions, scripts and attachments.
   clean=fitz.open();clean.insert_pdf(doc,links=False,annots=False,widgets=False)
   metadata=doc.metadata or {};clean.set_metadata({k:v for k,v in metadata.items() if k in ['title','author','subject','keywords'] and v})
   if len(data)>3_000_000:clean.rewrite_images(dpi_threshold=180,dpi_target=144,quality=78,bitonal=False)
   title=unicodedata.normalize('NFC',Path(info.filename).name)
   title=re.sub(r'(\.pdf)+$','',title,flags=re.I);title=re.sub(r'\s*\(1\)','',title);title=title.replace('_',' ').strip(' .-📔')
   title=re.sub(r'\s+',' ',title);title=title[0].upper()+title[1:]
   parts=[]
   def part(a,b):
    out=fitz.open();out.insert_pdf(clean,from_page=a,to_page=b,links=False,annots=False,widgets=False)
    buffer=out.tobytes(garbage=4,deflate=True);out.close()
    if len(buffer)>8_000_000 and b>a:
     mid=(a+b)//2;part(a,mid);part(mid+1,b);return
    if len(buffer)>24_000_000:raise ValueError('Page isolée trop volumineuse')
    name='section-'+str(len(parts)+1).zfill(3)+'.pdf';(folder/name).write_bytes(buffer)
    parts.append({'url':'/books/'+key+'/'+name,'pages':b-a+1,'startPage':a+1,'bytes':len(buffer)})
   for a in range(0,pages,40):part(a,min(a+39,pages-1))
   # Cover is a small preview, generated from the document itself.
   first=clean[0];pix=first.get_pixmap(matrix=fitz.Matrix(320/first.rect.width,320/first.rect.width),alpha=False)
   pix.save(str(folder/'cover.png'))
   author=(metadata.get('author') or '').strip()
   if len(author)>100 or any(x in author.lower() for x in ['microsoft','windows','user','admin','canon','epson']):author=''
   first_text=doc[0].get_text()[:3000]
   entry={'id':key,'title':title,'author':author or 'Auteur indiqué dans l’ouvrage','category':category(title),'language':'Anglais' if 'TafseerAyat' in title else 'Français','description':str(pages)+' pages · Ouvrage fourni dans le pack JFSI.','format':'pdf','source':'Pack islamique Livres et leadership transmis par le JFSI','url':parts[0]['url'],'cover':'/books/'+key+'/cover.png','parts':parts,'pages':pages,'originalBytes':len(data),'readingBytes':sum(p['bytes'] for p in parts),'visibility':'public','status':'Publié','publishAt':'','sha256':sha,'originalName':info.filename}
   manifest.append(entry)
   if len(data)>50_000_000:
    clean[min(10,pages-1)].get_pixmap(matrix=fitz.Matrix(1,1),alpha=False).save(str(work/(key+'-sample.png')))
   clean.close();doc.close()
   print(f'BOOK {index+1}/99 {key} pages={pages} original={len(data)} reading={entry["readingBytes"]}',flush=True)
  except Exception as e:
   errors.append({'file':info.filename,'error':str(e)});print('ERROR',info.filename,str(e),flush=True)
(root/'lib'/'books.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(work/'import-report.json').write_text(json.dumps({'books':len(manifest),'duplicates':duplicates,'errors':errors,'originalBytes':sum(x['originalBytes'] for x in manifest),'readingBytes':sum(x['readingBytes'] for x in manifest),'pages':sum(x['pages'] for x in manifest)},ensure_ascii=False,indent=2),encoding='utf-8')
print('RESULT',len(manifest),'books',len(duplicates),'duplicates',len(errors),'errors',flush=True)
if errors:sys.exit(1)
