import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {duesStatement} from '../lib/billing.ts';
// Node's stripped TypeScript loader needs explicit .ts imports in this in-memory copy.
const source=readFileSync('lib/marriage-domain.ts','utf8').replace("from './billing'","from './billing.ts'");
const path=new URL('../lib/.marriage-domain-test.ts',import.meta.url);
writeFileSync(path,source);
const {marriageEligibility,sixMonthsAfter,marriageInput}=await import(path.href);
const {unlinkSync}=await import('node:fs');unlinkSync(path);
const report=[];function check(name,fn){fn();report.push({name,pass:true});console.log('PASS '+name)}
const s={monthly:1000,adhesion:2500,duesRates:[{from:'0000-01',amount:500},{from:'2026-10',amount:1000}]};
const m={joined:'2026-03-24T12:00:00Z',status:'adherent',suspended:0};
const paid=Array.from({length:7},(_,i)=>({type:'cotisation',period:'2026-'+String(i+3).padStart(2,'0'),amount:500,status:'approved'}));
check('Six mois exacts, veille refusée',()=>{assert.equal(marriageEligibility(m,paid,s,new Date('2026-09-24T11:59:59Z')).eligible,false);assert.equal(marriageEligibility(m,paid,s,new Date('2026-09-24T12:00:00Z')).eligible,true)});
check('Fin de mois corrigée : 31 août vers 28 février',()=>assert.equal(sixMonthsAfter('2026-08-31T10:00:00Z').toISOString(),'2027-02-28T10:00:00.000Z'));
check('Un impayé bloque Mariage',()=>assert.equal(marriageEligibility(m,paid.slice(1),s,new Date('2026-09-25')).eligible,false));
check('Paiement soumis ne règle pas un arriéré',()=>assert.equal(marriageEligibility(m,[{...paid[0],status:'submitted'},...paid.slice(1)],s,new Date('2026-09-25')).eligible,false));
check('Suspension ferme le service',()=>assert.equal(marriageEligibility({...m,suspended:1},paid,s,new Date('2026-09-25')).eligible,false));
check('Hausse future non rétroactive',()=>assert.equal(duesStatement(m,paid,s,new Date('2026-09-25')).due,0));
check('Avance ne masque pas un arriéré',()=>{const r=duesStatement(m,[...paid.slice(1),{type:'cotisation',period:'2026-10',amount:1000,status:'approved'}],s,new Date('2026-09-25'));assert.equal(r.due,500);assert.equal(r.advance,1000)});
check('Questionnaire interdit âge mineur',()=>assert.equal(marriageInput.safeParse({age:'Moins de 18 ans'}).success,false));
writeFileSync('docs/tests-domain.json',JSON.stringify({date:new Date().toISOString(),tests:report,passed:report.length,total:report.length},null,2));
