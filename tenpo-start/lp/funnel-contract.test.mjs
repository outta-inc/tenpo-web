import assert from 'node:assert/strict';
import F from './funnel-contract.mjs';
const p=o=>({get:k=>Object.prototype.hasOwnProperty.call(o,k)?o[k]:null});
const now=Date.UTC(2026,10,22,15,0);
assert.deepEqual(F.classify(p({src:'ads',intent:'cafe',gclid:'secret'})),{source:'ads',intent:'cafe'});
assert.deepEqual(F.classify(p({src:'unknown',intent:'__proto__'})),{source:'other',intent:'general'});
assert.deepEqual(F.classify(p({})),{source:'direct',intent:'general'});
assert.equal(F.weekJST(now),'2026-11-23');assert.equal(F.weekJST(now-1),'2026-11-16');assert.equal(F.weekJST(NaN),null);
assert.equal(F.permitted(),false);
const on={releaseEnabled:true,production:true,noticeApproved:true,consent:true};assert.equal(F.permitted(on),true);
for(const key of ['releaseEnabled','production','noticeApproved','consent'])assert.equal(F.permitted({...on,[key]:false}),false);
for(const key of ['doNotTrack','gpc','nostat','webdriver'])assert.equal(F.permitted({...on,[key]:true}),false);
const f=F.make({params:p({src:'ads',intent:'cost',gclid:'secret'}),now});
assert.equal(f.mark('first_plan_saved'),null);assert.equal(f.mark('anything'),null);
assert.deepEqual(f.mark('lp_view'),{event:'lp_view',cohort:'2026-11-23',source:'ads',intent:'cost'});
assert.equal(f.mark('lp_view'),null);assert.equal(f.mark('handoff_confirm'),null);assert.equal(f.mark('app_received'),null);
for(const name of ['trial_changed','handoff_review','handoff_confirm','app_received','plan_ready','first_plan_saved']){
 const x=f.mark(name);assert.equal(x.event,name);assert.deepEqual(Object.keys(x).sort(),['cohort','event','intent','source']);assert.equal(f.mark(name),null);
}
console.log('funnel contract passed');
