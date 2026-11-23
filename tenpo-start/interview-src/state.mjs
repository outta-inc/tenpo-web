import {VERSION,ALL,CORE,BUSINESSES,CATEGORIES,valueOf,modelOf,isActive,questionsFor,categoryOf} from './questions.mjs';
export const STORAGE_KEY='tenpo-start:interview:v1';
const stat=['answered','provisional','undecided','skipped','declined'];
const blank=status=>({value:null,status,source:'user',updatedAt:null});
export function createInterview(id,now){
 return {schemaVersion:VERSION,interviewId:id,createdAt:now,updatedAt:now,answers:{},
  archived:[],ui:{questionId:'category'},consultation:{number:null,preparedCount:0,sentCount:null}};
}
function validValue(q,v){
 if(q.type==='select')return q.options.some(o=>o.value===v);
 if(q.type==='number')return typeof v==='number'&&Number.isFinite(v)&&v>=q.min&&(!q.integer||Number.isSafeInteger(v))&&(q.max===undefined||v<=q.max);
 if(q.type==='text')return typeof v==='string'&&v.trim().length>0&&v.length<=q.maxLength;
 if(q.type==='group')return v && !Array.isArray(v) && typeof v==='object' &&
  Object.keys(v).every(k=>q.fields.some(f=>f.id===k)) &&
  q.fields.every(f=>v[f.id]===null || v[f.id]===undefined || validValue(f,v[f.id])) &&
  q.fields.some(f=>validValue(f,v[f.id]));
 return false;
}
export function setAnswer(state,id,value,status,now){
 const q=[...questionsFor(state),...questionsFor(state,{optional:true})].find(q=>q.id===id);
 if(!q||!isActive(q,state))throw new Error('今の設問ではありません');
 if(!stat.includes(status)||(status==='declined'&&!q.private))throw new Error('回答の状態を確かめてください');
 const has=['answered','provisional'].includes(status);
 if(has&&!validValue(q,value))throw new Error('単位と入力内容を確かめてください');
 const next=structuredClone(state);const oldModel=modelOf(state);
 next.answers[id]={value:has?structuredClone(value):null,status,source:'user',updatedAt:now};
 // A branch switch must never reinterpret 12 seats as 12 beds, or per-person price as per-check price.
 if(id==='businessType' && valueOf(next,id)!==valueOf(state,id) && next.answers.salesModel){
  next.archived.push({id:'salesModel',answer:next.answers.salesModel,at:now});delete next.answers.salesModel;
 }
 // 大項目を変えたら、合わなくなった中項目と売上の形を外す（消さずに archived へ）。
 if(id==='category' && valueOf(next,id)!==valueOf(state,id)){
  const b=valueOf(next,'businessType');
  if(next.answers.businessType&&b!==null&&categoryOf(b)!==valueOf(next,'category')){next.archived.push({id:'businessType',answer:next.answers.businessType,at:now});delete next.answers.businessType;}
  if(next.answers.salesModel){next.archived.push({id:'salesModel',answer:next.answers.salesModel,at:now});delete next.answers.salesModel;}
 }
 const newModel=modelOf(next);
 const reset=oldModel!==newModel?['capacity','averageSpendYen','serviceMinutes','peakStaff','helperHoursPerDay']:[];
 for(const field of ALL){if(next.answers[field.id]&&(reset.includes(field.id)||!isActive(field,next))){
  next.archived.push({id:field.id,model:oldModel,answer:next.answers[field.id],at:now});delete next.answers[field.id];
 }}
 next.updatedAt=now;return next;
}
export function calculationInput(state){
 const model=modelOf(state),need=[valueOf(state,'category')===null&&valueOf(state,'businessType')!==null?'businessType':'category','averageSpendYen','peakStaff'];
 if(!model)need.push('salesModel');
 if(model==='seated'||model==='salon')need.push('capacity');
 if(model==='salon')need.push('serviceMinutes');
 const missing=[...new Set(need)].filter(k=>valueOf(state,k)===null);
 const data={model,capacity:model==='takeaway'?null:valueOf(state,'capacity'),
  averageSpendYen:valueOf(state,'averageSpendYen'),peakStaff:valueOf(state,'peakStaff'),
  serviceMinutes:model==='salon'?valueOf(state,'serviceMinutes'):null};
 return {ready:missing.length===0,missing,data,sources:Object.fromEntries(need.map(k=>[k,state.answers[k]||blank('undecided')]))};
}
export function progress(state,id,{optional=false}={}){const qs=questionsFor(state,{optional});
 const position=Math.max(0,qs.findIndex(q=>q.id===id))+1;
 return {position,total:qs.length,answered:qs.filter(q=>valueOf(state,q.id)!==null).length,
 label:`${optional?'追加の質問':'お店の質問'} ${position}/${qs.length}`};
}
export function saveInterview(storage,state){
 try{storage.setItem(STORAGE_KEY,JSON.stringify(state));return {ok:true};}
 catch{return {ok:false,message:'この端末に保存できませんでした。画面を閉じる前に、答えをコピーして残してください。'};}
}
export function loadInterview(storage){
 try{const raw=storage.getItem(STORAGE_KEY);if(!raw)return {state:null,error:null};const s=JSON.parse(raw);
  if(s.schemaVersion!==VERSION)return {state:null,error:'別の版の答えです。元の内容を残して、読み込み方を確かめてください。'};
  if(!s.answers||Array.isArray(s.answers)||!Array.isArray(s.archived)||!s.ui)throw new Error('format');
  for(const [id,a]of Object.entries(s.answers)){
   const q=ALL.find(q=>q.id===id);
   if(!q||!a||!stat.includes(a.status)||(a.status==='declined'&&!q.private)||
    (['answered','provisional'].includes(a.status)?!validValue(q,a.value):a.value!==null))throw new Error('answer');
  }return {state:s,error:null};
 }catch{return {state:null,error:'保存した答えを読み込めませんでした。元の内容は消していません。'};}
}
export function legacyPayload(state){
 const c=calculationInput(state);if(!c.ready)return {ready:false,missing:c.missing,payload:null};
 const v=id=>valueOf(state,id),p=c.data;
 // A handoff payload only. Existing applyUser() must preserve sources and handle model-specific units.
 const businessLabel=(BUSINESSES.find(o=>o.value===v('businessType'))||CATEGORIES.find(o=>o.value===v('category'))||{}).label;
 return {ready:true,missing:[],payload:{biz:{seated:'カフェ',takeaway:'持ち帰りの店',salon:'サロン'}[p.model],businessLabel,
  category:v('category'),businessType:v('businessType'),purpose:v('purpose'),item:v('mainProduct'),seats:p.model==='takeaway'?0:p.capacity,
  price:p.averageSpendYen,team:p.peakStaff,dur:p.serviceMinutes,
  time:v('businessHours'),off:v('daysOffPerWeek'),who:v('operators')??({yes:'自分もお店で働く',no:'人に任せる'}[v('selfWork')]??null),keepYen:v('desiredMonthlyTakeHomeYen'),
  ownYen:v('ownFundsYen'),place:v('propertyStage'),priorities:v('priorities'),
  selfWork:v('selfWork'),openingWhen:v('openingWhen'),
  existing:v('experience')==='operating'?{guests:v('existingGuestsPerDay'),seats:v('existingSeats'),days:v('existingDaysPerMonth'),costRatePct:v('existingCostRatePct')}:null,
  sources:c.sources},
  requiresIntegration:true};
}
