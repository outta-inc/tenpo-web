import test from 'node:test';
import assert from 'node:assert/strict';
import {questionsFor,modelOf} from './questions.mjs';
import {createInterview,setAnswer,calculationInput,saveInterview,loadInterview,legacyPayload,STORAGE_KEY} from './state.mjs';
const now='2026-11-21T09:00:00+09:00';
const base=()=>createInterview('EXAMPLE-NOT-A-PERSON',now);
const set=(s,k,v,status='provisional')=>setAnswer(s,k,v,status,now);
function cafe(){let s=set(base(),'businessType','cafe');for(const [k,v]of Object.entries({capacity:12,averageSpendYen:1100,peakStaff:2}))s=set(s,k,v);return s;}
test('all undecided is saved without supplying a default calculation',()=>{
 let s=set(base(),'businessType',null,'undecided');s=set(s,'averageSpendYen',null,'skipped');
 assert.equal(calculationInput(s).ready,false);assert.equal(legacyPayload(s).payload,null);
 assert.equal(calculationInput(s).data.averageSpendYen,null);
});
test('cafe has nine core screens and passes 12 seats / 1100 yen / 2 people unchanged',()=>{
 const s=cafe();assert.equal(questionsFor(s).length,9);assert.equal(calculationInput(s).ready,true);
 assert.deepEqual(calculationInput(s).data,{model:'seated',capacity:12,averageSpendYen:1100,peakStaff:2,serviceMinutes:null});
 assert.equal(calculationInput(s).sources.capacity.status,'provisional');
});
test('salon requires service duration; seat data cannot silently become beds',()=>{
 let s=set(cafe(),'businessType','salon');assert.equal(modelOf(s),'salon');assert.equal(s.answers.capacity,undefined);
 assert.equal(s.archived.find(a=>a.id==='capacity').answer.value,12);
 for(const [k,v]of Object.entries({capacity:2,averageSpendYen:8000,peakStaff:1}))s=set(s,k,v);
 assert.ok(calculationInput(s).missing.includes('serviceMinutes'));
 s=set(s,'serviceMinutes',45);assert.equal(calculationInput(s).ready,true);assert.equal(questionsFor(s).length,10);
});
test('cake shop branches explicitly and stale salon fields are archived',()=>{
 let s=set(base(),'businessType','cake');assert.equal(modelOf(s),null);
 s=set(s,'salesModel','takeaway');assert.equal(questionsFor(s).some(q=>q.id==='capacity'),false);
 assert.throws(()=>set(s,'capacity',0));s=set(s,'averageSpendYen',2400);s=set(s,'peakStaff',2);
 assert.equal(calculationInput(s).ready,true);assert.equal(calculationInput(s).data.capacity,null);
 assert.equal(legacyPayload(s).payload.seats,0);
 s=set(s,'businessType','cafe');assert.equal(s.answers.salesModel,undefined);assert.equal(s.answers.averageSpendYen,undefined);
});
test('invalid numeric inputs rejected; zero own funds and zero days off stay numeric zero',()=>{
 for(const bad of ['', '1100',NaN,Infinity,-1,0,1.5])assert.throws(()=>set(cafe(),'capacity',bad));
 let s=set(cafe(),'ownFundsYen',0);s=set(s,'daysOffPerWeek',0);assert.equal(s.answers.ownFundsYen.value,0);
 assert.throws(()=>set(s,'daysOffPerWeek',8));assert.throws(()=>set(s,'businessType','fake'));
});
test('experience is distinct from property progress',()=>{
 let s=set(cafe(),'experience','operating','answered');s=set(s,'propertyStage','idea');
 assert.ok(questionsFor(s,{optional:true}).some(q=>q.id==='existingEvidence'));
 s=set(s,'existingEvidence','直近4週間の売上記録','answered');s=set(s,'experience','first');
 assert.equal(s.answers.existingEvidence,undefined);assert.equal(s.answers.propertyStage.value,'idea');
});
test('one priority can remain undecided; private answer can be declined',()=>{
 let s=set(cafe(),'priorities',{mustKeep:'夕方に閉める',canAdjust:null});
 s=set(s,'ownFundsYen',null,'declined');assert.equal(s.answers.ownFundsYen.value,null);
 assert.throws(()=>set(s,'peakStaff',null,'declined'));
});
test('roundtrip, storage failures and incompatible versions never overwrite old data',()=>{
 const mem=new Map(),storage={setItem:(k,v)=>mem.set(k,v),getItem:k=>mem.get(k)};
 const s=cafe();assert.equal(saveInterview(storage,s).ok,true);assert.deepEqual(loadInterview(storage).state,s);
 assert.equal(saveInterview({setItem(){throw Error('quota')}},s).ok,false);
 storage.setItem(STORAGE_KEY,'{"schemaVersion":"9.0"}');assert.ok(loadInterview(storage).error);
 assert.equal(storage.getItem(STORAGE_KEY),'{"schemaVersion":"9.0"}');
 storage.setItem(STORAGE_KEY,'broken');assert.ok(loadInterview(storage).error);
});
