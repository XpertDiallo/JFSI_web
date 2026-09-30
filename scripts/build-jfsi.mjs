for(const b of JSON.parse(readFileSync('lib/books.json','utf8'))){if(!existsSync('public'+b.url))throw Error('Ressource de bibliothèque absente : '+b.id+' ; restaurer public/books depuis l’archive de livraison.')}
import {copyFileSync,mkdirSync,existsSync,readFileSync} from 'node:fs';
mkdirSync('public/vendor',{recursive:true});
copyFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/vendor/pdf.worker.min.mjs');
import './prepare-private-assets.mjs';
import {spawnSync} from 'node:child_process';
const r=spawnSync(process.execPath,['scripts/run-framework.mjs','build'],{stdio:'inherit'});
process.exit(r.status??1);
