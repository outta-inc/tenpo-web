import assert from 'node:assert/strict';
import h from './handoff-contract.mjs';
const now=1795647600000; const pack=(tool,stage,picked,values,touched,checks=[])=>h.pack(tool,stage,picked,values,new Set(touched),new Set(checks),now);
const base=()=>pack('sales','idea',true,{price:1200,guests:20,days:26},['sales.price','sales.guests']);
assert.deepEqual({...base().values},{price:1200,guests:20});
assert.deepEqual({...pack('sales','idea',false,{price:1100},[]).values},{});
assert.equal(pack('sales','idea',false,{price:1100},[]).stage,null);
assert.equal(base().stage,'idea');
assert.deepEqual({...pack('sales','idea',true,{price:1200,guests:20},['property.price','sales.guests']).values},{guests:20});
assert.equal(pack('capital','idea',true,{own:0},['capital.own']).values.own,0);
assert.equal(pack('property','search',true,{rent:18.5},['property.rent']).values.rent,185000);
assert.equal(pack('property','search',true,{rate:31.5},['property.rate']).values.rate,31.5);
assert.deepEqual({...pack('sales','idea',true,{price:null},['sales.price']).values},{});
assert.deepEqual(pack('check','prep',true,undefined,[],[2,0]).checks,[0,2]);
assert.deepEqual(pack('check','prep',true,undefined,[],[1,1]).checks,[1]);
for(const change of [p=>p.version=2,p=>p.tool='__proto__',p=>p.stage='hack',p=>p.values.extra=1,p=>p.extra=1,p=>p.createdAt=now-1800001,p=>p.createdAt=now+5001,p=>p.values.price='1200',p=>p.values.price=-1,p=>p.values.price=1.5,p=>p.values.price=100001,p=>p.checks=[0],p=>p.values.days=32,p=>p.values.guests=1.5]){const p=base();change(p);assert.equal(h.parse(p,now),null)}
assert.ok(h.parse(JSON.parse(JSON.stringify(base())),now));
assert.ok(h.parse(base(),now+1800000));assert.equal(h.parse(base(),now+1800001),null);
for(const checks of [[1,1],[9]]){const p=pack('check','prep',true,undefined,[],[1]);p.checks=checks;assert.equal(h.parse(p,now),null)}
assert.equal(h.parse(null,now),null);assert.equal(h.parse([],now),null);const p=base();p.values=JSON.parse('{"__proto__":1}');assert.equal(h.parse(p,now),null);
console.log('handoff contract tests passed');
