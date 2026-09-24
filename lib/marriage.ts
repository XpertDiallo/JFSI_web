import {marriageEligibility,marriagePublic} from './marriage-domain';
import {list,one,settings} from './store';
import {AppError} from './security';
import type {Member} from './domain';
export async function eligibility(m:Member){return marriageEligibility(m,(await list(m.tenant,'payment')).filter(p=>p.owner===m.id),await settings(m.tenant))}
export async function requireEligible(m:Member){const e=await eligibility(m);if(!e.eligible)throw new AppError(403,e.message);return e}
export async function visibleMarriage(r:any){if(r.status!=='Approuvé'||!r.profile?.consentDisplay||!r.profile?.consentPhoto)return false;const m=await one('SELECT * FROM members WHERE id=? AND tenant=?',r.owner,r.tenant);return !!m&&(await eligibility(m)).eligible}
export {marriagePublic};
