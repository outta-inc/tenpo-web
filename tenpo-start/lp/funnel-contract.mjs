// TENPO/START LP measurement proposal. Pure contract; no transport, storage or Google tag.
// Production remains OFF until policy, server aggregation and release are approved.
const INTENTS=Object.freeze(['general','cafe','food','cost','property','prep']);
const SOURCES=Object.freeze(['ads','note','direct','other']);
const EVENTS=Object.freeze(['lp_view','trial_changed','handoff_review','handoff_confirm','app_received','plan_ready','first_plan_saved']);
function classify(params){
 const i=params.get('intent'),s=params.get('src');
 return Object.freeze({intent:INTENTS.includes(i)?i:'general',source:s==null?'direct':SOURCES.includes(s)?s:'other'});
}
function weekJST(ts){
 if(!Number.isFinite(ts))return null;
 const d=new Date(ts+9*3600000);
 if(!Number.isFinite(d.getTime()))return null;
 const m=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-(d.getUTCDay()+6)%7));
 return m.toISOString().slice(0,10);
}
function permitted({releaseEnabled=false,production=false,noticeApproved=false,consent=false,doNotTrack=false,gpc=false,nostat=false,webdriver=false}={}){
 return releaseEnabled===true&&production===true&&noticeApproved===true&&consent===true&&!doNotTrack&&!gpc&&!nostat&&!webdriver;
}
function make({params,now=Date.now()}){
 const meta=classify(params),cohort=weekJST(now),sent=new Set();
 if(!cohort)throw Error('invalid week');
 // A count, never an identity. Dedup is local to this in-memory review instance.
 function mark(event){
  if(!EVENTS.includes(event)||sent.has(event))return null;
  if(event!=='lp_view'&&!sent.has('lp_view'))return null;
  if(event==='handoff_confirm'&&!sent.has('handoff_review'))return null;
  if(event==='app_received'&&!sent.has('handoff_confirm'))return null;
  if(['plan_ready','first_plan_saved'].includes(event)&&!sent.has('app_received'))return null;
  sent.add(event);return Object.freeze({event,cohort,source:meta.source,intent:meta.intent});
 }
 return Object.freeze({mark});
}
const FUNNEL=Object.freeze({INTENTS,SOURCES,EVENTS,classify,weekJST,permitted,make});
export default FUNNEL;
