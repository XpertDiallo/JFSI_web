import entries from './editorial.json';
import {db,one,statement} from './store';
async function seed(tenant:string){if(await one('SELECT id FROM claims WHERE id=?','editorial-v4:'+tenant))return;const now=new Date().toISOString();await db().batch([...entries.map((e,i)=>statement('INSERT OR IGNORE INTO records(id,tenant,kind,owner,data,version,updated) VALUES(?,?,?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data WHERE records.version=1','editorial-'+tenant+'-'+i,tenant,e.kind,'editorial',JSON.stringify({...e,status:'Publié',hidden:false,locked:false,author:'Communication JFSI · support transmis',imported:true}),now)),statement('INSERT OR IGNORE INTO claims(id,value) VALUES(?,?)','editorial-v4:'+tenant,now)])}

const initialized=new Set<string>(),inflight=new Map<string,Promise<void>>();
export async function seedEditorial(tenant:string){if(initialized.has(tenant))return;if(inflight.has(tenant))return inflight.get(tenant);const task=seed(tenant).then(()=>{initialized.add(tenant)}).finally(()=>inflight.delete(tenant));inflight.set(tenant,task);return task}
