import './prepare-private-assets.mjs';
import {spawnSync} from 'node:child_process';
const r=spawnSync(process.execPath,['scripts/run-framework.mjs','build'],{stdio:'inherit'});
process.exit(r.status??1);
