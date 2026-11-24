import test from 'node:test';
import assert from 'node:assert/strict';
import {questionsFor,modelOf,weekStats,WEEK_PRESETS,wordsOf} from './questions.mjs';
import {createInterview,setAnswer,calculationInput,saveInterview,loadInterview,legacyPayload,progress,STORAGE_KEY} from './state.mjs';
const now='2026-11-24T09:00:00+09:00';
const base=()=>createInterview('EXAMPLE-NOT-A-PERSON',now);
const set=(s,k,v,status='provisional')=>setAnswer(s,k,v,status,now);
const week=id=>[0,1,2,3,4,5,6].map(WEEK_PRESETS.find(p=>p[0]===id)[2]);
function cafe(){let s=set(set(set(base(),'experience','first'),'category','food'),'businessType','cafe');
 s=set(s,'schedule',week('weekdayBoth'));for(const [k,v]of Object.entries({averageSpendYen:3500,secondSpendYen:1200,capacity:12}))s=set(s,k,v);return s;}
test('first hearing is five screens (the type is chosen on the category screen)',()=>{
 const s=cafe();const ids=questionsFor(s).filter(q=>!q.inline).map(q=>q.id);
 assert.deepEqual(ids,['experience','category','schedule','averageSpendYen','capacity']);
 assert.equal(progress(s,'capacity').total,5);
});
test('only the business is needed to calculate; undecided numbers stay null (no silent defaults)',()=>{
 let s=set(set(base(),'category','food'),'businessType','bar');
 s=set(s,'schedule',null,'undecided');s=set(s,'averageSpendYen',null,'undecided');s=set(s,'capacity',null,'undecided');
 const c=calculationInput(s);assert.equal(c.ready,true);assert.equal(c.data.averageSpendYen,null);assert.equal(c.data.capacity,null);assert.equal(c.data.schedule,null);
 assert.equal(c.sources.capacity.status,'undecided');
});
test('week: open days, bands and who stands are counted separately',()=>{
 const w=week('monSatLunchSatNight');w[0]=[1,2];const z=weekStats(w);
 assert.deepEqual([z.days,z.l,z.d,z.me,z.st],[6,6,2,7,1]);
 const s=set(set(set(base(),'category','food'),'businessType','cafe'),'schedule',w);
 assert.equal(legacyPayload(s).payload.selfWork,'yes');
 const all=w.map(([l,d])=>[l?2:0,d?2:0]);assert.equal(legacyPayload(set(s,'schedule',all)).payload.selfWork,'no');
});
test('week validation: shape and at least one open slot',()=>{
 const s=set(set(base(),'category','food'),'businessType','cafe');
 for(const bad of [[],week('nightly').slice(0,6),week('nightly').map(()=>[0,0]),week('nightly').map(()=>[3,0]),'月火'])assert.throws(()=>set(s,'schedule',bad));
});
test('second price only when both bands open; the other-band question only when one band',()=>{
 let s=cafe();assert.ok(questionsFor(s).some(q=>q.id==='secondSpendYen'));assert.ok(!questionsFor(s).some(q=>q.id==='otherBand'));
 s=set(s,'schedule',week('nightly'));assert.equal(s.answers.secondSpendYen,undefined);
 assert.ok(questionsFor(s).some(q=>q.id==='otherBand'));s=set(s,'otherBand','no');assert.equal(legacyPayload(s).payload.otherBand,'no');
});
test('six categories; each lists only its own types; words change by category',()=>{
 let s=set(base(),'category','school');assert.equal(modelOf(s),'salon');
 assert.deepEqual(questionsFor(s).find(q=>q.id==='businessType').options.map(o=>o.value),['juku','cooking','yoga','gym']);
 assert.equal(questionsFor(s).find(q=>q.id==='capacity').unit,'人');
 s=set(s,'category','takeaway');assert.equal(questionsFor(s).some(q=>q.id==='capacity'),false);
 assert.equal(wordsOf(set(base(),'category','space')).capUnit,'室');
 const cats=questionsFor(base()).find(q=>q.id==='category').options.map(o=>o.value);
 assert.deepEqual(cats,['food','takeaway','beauty','school','space','life']);
});
test('changing the model archives seats and price instead of reinterpreting them',()=>{
 let s=set(cafe(),'category','beauty');assert.equal(modelOf(s),'salon');assert.equal(s.answers.capacity,undefined);
 assert.equal(s.archived.find(a=>a.id==='capacity').answer.value,12);
});
test('invalid numeric inputs rejected',()=>{
 for(const bad of ['', '1100',NaN,Infinity,-1,0,1.5,201])assert.throws(()=>set(cafe(),'capacity',bad));
 assert.throws(()=>set(cafe(),'businessType','fake'));
});
test('existing shop questions only for people who run a shop now',()=>{
 let s=set(cafe(),'experience','operating');assert.ok(questionsFor(s).some(q=>q.id==='existingGuestsPerDay'));
 s=set(s,'existingGuestsPerDay',40);s=set(s,'experience','first');assert.equal(s.answers.existingGuestsPerDay,undefined);
});
test('roundtrip, storage failures and incompatible versions never overwrite old data',()=>{
 const mem=new Map(),storage={setItem:(k,v)=>mem.set(k,v),getItem:k=>mem.get(k)};
 const s=cafe();assert.equal(saveInterview(storage,s).ok,true);assert.deepEqual(loadInterview(storage).state,s);
 assert.equal(saveInterview({setItem(){throw Error('quota')}},s).ok,false);
 storage.setItem(STORAGE_KEY,'{"schemaVersion":"9.0"}');assert.ok(loadInterview(storage).error);
 storage.setItem(STORAGE_KEY,'broken');assert.ok(loadInterview(storage).error);
});
test('answers saved by the previous version still load and keep their model',()=>{
 const store=new Map();const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const old=base();old.ui={questionId:'priorities'};
 const A=(v,st='provisional')=>({value:v,status:st,source:'user',updatedAt:now});
 Object.assign(old.answers,{category:A('seated'),businessType:A('cafe'),experience:A('worked'),purpose:A('昼食'),capacity:A(12),averageSpendYen:A(1100),
  peakStaff:A(2),selfWork:A('yes'),propertyStage:A('area'),daysOffPerWeek:A(1),desiredMonthlyTakeHomeYen:A(250000),guestsPerDay:A(30)});
 storage.setItem(STORAGE_KEY,JSON.stringify(old));const r=loadInterview(storage);
 assert.equal(r.error,null);assert.equal(modelOf(r.state),'seated');
 const p=legacyPayload(r.state).payload;assert.equal(p.seats,12);assert.equal(p.price,1100);assert.equal(p.selfWork,'yes');assert.equal(p.week,null);
 old.answers.category=A('salon');old.answers.businessType=A('salon');storage.setItem(STORAGE_KEY,JSON.stringify(old));
 assert.equal(modelOf(loadInterview(storage).state),'salon');
 // 前の版の「ほかの業態」＋売上の形
 const o2=base();Object.assign(o2.answers,{category:A('other'),salesModel:A('takeaway')});storage.setItem(STORAGE_KEY,JSON.stringify(o2));
 assert.equal(modelOf(loadInterview(storage).state),'takeaway');
});
// 2026/11/25：整体・整骨院・鍼灸院・ペットホテルと、教室・運動の月謝（会員制）
test('beauty has seitai, seikotsu and shinkyu on their own; life has a pet hotel',()=>{
 const s=set(base(),'category','beauty');const b=questionsFor(s).find(q=>q.id==='businessType').options.map(o=>o.value);
 for(const v of ['relax','seitai','seikotsu','shinkyu'])assert.ok(b.includes(v),v);
 const l=questionsFor(set(base(),'category','life')).find(q=>q.id==='businessType').options.map(o=>o.value);
 assert.deepEqual(l,['petsalon','pethotel']);
 assert.equal(modelOf(set(s,'businessType','seikotsu')),'salon');
});
test('school asks how the fee is paid; monthly changes the price question and the payload',()=>{
 let s=set(set(base(),'category','school'),'businessType','yoga');
 assert.ok(questionsFor(s).some(q=>q.id==='feeModel'));
 assert.ok(!questionsFor(set(set(base(),'category','beauty'),'businessType','seitai')).some(q=>q.id==='feeModel'));
 s=set(s,'feeModel','monthly');
 assert.equal(questionsFor(s).find(q=>q.id==='averageSpendYen').label,'1人の月謝（月額）は、いくらくらいですか？');
 assert.equal(wordsOf(s).capUnit,'人');
 s=set(s,'averageSpendYen',9000);
 assert.equal(legacyPayload(s).payload.fee,'monthly');assert.equal(legacyPayload(s).payload.price,9000);
 // 1回ごとに変えたら、月額の金額は使わない
 const v=set(s,'feeModel','visit');assert.equal(calculationInput(v).data.averageSpendYen,null);assert.equal(legacyPayload(v).payload.fee,null);
 assert.ok(v.archived.some(a=>a.id==='averageSpendYen'));
 // 教室から外れたら、料金の形の答えも使わない
 const c=set(set(s,'category','beauty'),'businessType','seitai');assert.equal(legacyPayload(c).payload.fee,null);
});
