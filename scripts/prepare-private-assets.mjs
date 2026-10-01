import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
const entries=JSON.parse(readFileSync('lib/editorial.json','utf8'));
const images={};
const honourFile=path.join('resources-private','Membre_honneur1.jpeg');
if(existsSync(honourFile))images['honour-aboubakr-siddiq-doumbia']={data:readFileSync(honourFile).toString('base64'),visibility:'public'};
for(const e of entries){const file=path.join('resources-private',e.filename);if(existsSync(file))images[e.assetKey]={data:readFileSync(file).toString('base64'),visibility:e.visibility}}
mkdirSync('.sites-private',{recursive:true});
writeFileSync('.sites-private/editorial-assets.ts','export default '+JSON.stringify(images)+' as Record<string,{data:string;visibility:string}>;\n');

const portraits={};for(const key of ['man','woman']){const file=path.join('resources-private','demo-'+key+'.png');if(existsSync(file))portraits[key]=readFileSync(file).toString('base64')}writeFileSync('.sites-private/demo-assets.ts','export default '+JSON.stringify(portraits)+' as Record<string,string>;\n');
