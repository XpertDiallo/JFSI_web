import test from 'node:test';
import assert from 'node:assert/strict';
import {requestImport} from './import-request.mjs';
const config={origin:'https://site.example',sitesToken:'test',importToken:'test'},pause=async()=>{};
test('Reprise après une interruption du corps de réponse HTTP200',async()=>{let calls=0;const r=await requestImport(config,'',undefined,async()=>{calls++;return calls===1?{status:200,ok:true,text:async()=>{throw Error('terminated');}}:Response.json({ready:true});},pause);assert.equal(calls,2);assert.equal(r.ready,true);});
test('Échecs réseau bornés à cinq essais, secrets absents du message',async()=>{let calls=0;await assert.rejects(requestImport(config,'',undefined,async()=>{calls++;throw Error('sensitive');},pause),e=>!e.message.includes('sensitive'));assert.equal(calls,5);});
test('Refus403 non retenté, erreur503 retentée',async()=>{let calls=0;await assert.rejects(requestImport(config,'',undefined,async()=>{calls++;return Response.json({error:'Fermé'},{status:403});},pause));assert.equal(calls,1);calls=0;await requestImport(config,'',undefined,async()=>{calls++;return calls===1?Response.json({error:'Temporaire'},{status:503}):Response.json({ready:true});},pause);assert.equal(calls,2);});
