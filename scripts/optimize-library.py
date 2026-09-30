"""Convert large scanned books to one WebP per page, preserving originals."""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import json,sys
import pymupdf as fitz

def optimize(pair):
 root,book=pair
 r=Path(root);b=dict(book);folder=(r/'public/books'/b['id']).resolve()
 assert folder.is_relative_to((r/'public/books').resolve())
 doc=fitz.open(r/'resources-private/library-originals'/(b['id']+'.pdf'));size=0;texts={}
 for i,page in enumerate(doc):
  target=folder/('page-'+str(i+1).zfill(4)+'.webp')
  if not target.exists():target.write_bytes(page.get_pixmap(dpi=130,alpha=False).pil_tobytes(format='WEBP',quality=78,method=4))
  size+=target.stat().st_size
  txt=page.get_text().strip()
  if txt:texts[str(i+1)]=txt
 (folder/'text.json').write_text(json.dumps(texts,ensure_ascii=False),encoding='utf-8');size+=(folder/'text.json').stat().st_size
 for section in b['parts']:
  path=(r/'public'/section['url'].lstrip('/')).resolve();assert path.parent==folder
  if path.exists():path.unlink()
 b.update(format='pages',pageBase='/books/'+b['id']+'/',url='/books/'+b['id']+'/page-0001.webp',parts=[],readingBytes=size)
 doc.close();print('OPTIMIZED',b['id'],b['pages'],size,flush=True)
 return b

if __name__=='__main__':
 r=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent.parent
 books=json.loads((r/'lib/books.json').read_text(encoding='utf-8'))
 selected=[b for b in books if b.get('format')!='pages' and b['readingBytes']>10_000_000]
 with ProcessPoolExecutor(max_workers=3) as pool:
  for b in pool.map(optimize,[(str(r),b) for b in selected]):
   books=[b if old['id']==b['id'] else old for old in books]
 (r/'lib/books.json').write_text(json.dumps(books,ensure_ascii=False,indent=2),encoding='utf-8')
 p=r/'work/books/import-report.json';report=json.loads(p.read_text(encoding='utf-8'));report['readingBytes']=sum(b['readingBytes'] for b in books);report['largeBooksInPageReader']=sum(b['format']=='pages' for b in books);p.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print('TOTAL',report['readingBytes'],flush=True)
