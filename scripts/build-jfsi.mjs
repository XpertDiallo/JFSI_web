import {copyFileSync,mkdirSync,readdirSync,cpSync,rmSync,existsSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import './prepare-library-storage.mjs';
import './prepare-private-assets.mjs';
mkdirSync('public/vendor',{recursive:true});
copyFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/vendor/pdf.worker.min.mjs');
// Only this generated, project-local staging directory may be replaced.
// Original books remain in public/books and resources-private.
const staging=path.resolve('.sites-private/build-public');
const expected=path.join(path.resolve('.sites-private'),'build-public');
if(staging!==expected||!staging.startsWith(path.resolve('.')+path.sep))throw Error('Répertoire de préparation incorrect.');
if(existsSync(staging))rmSync(staging,{recursive:true,force:true});
mkdirSync(staging,{recursive:true});
for(const entry of readdirSync('public'))if(entry!=='books')cpSync(path.join('public',entry),path.join(staging,entry),{recursive:true});
const r=spawnSync(process.execPath,['scripts/run-framework.mjs','build'],{stdio:'inherit',env:{...process.env,JFSI_BUILD_PUBLIC_DIR:staging}});
process.exit(r.status??1);
