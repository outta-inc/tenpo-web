const HANDOFF=(()=>{
 const stages=['idea','search','apply','contract','prep','open'];
 const tools=['sales','property','capital','review','check','contractCheck'];
 const schema={sales:{price:[0,100000,'yen'],guests:[0,10000,'integer'],days:[0,31,'integer']},property:{rent:[0,100000000,'yen'],price:[0,100000,'yen'],days:[0,31,'integer'],guests:[0,10000,'integer'],rate:[0,100,'percent'],fixed:[0,100000000,'yen'],owner:[0,100000000,'yen']},capital:{property:[0,100000000,'yen'],build:[0,100000000,'yen'],equip:[0,100000000,'yen'],other:[0,100000000,'yen'],reserve:[0,100000000,'yen'],own:[0,100000000,'yen']},review:{planned:[0,100000000,'yen'],actual:[0,100000000,'yen']},check:{},contractCheck:{}};
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k), obj=o=>o!==null&&typeof o==='object'&&!Array.isArray(o), keys=(o,allowed)=>Object.keys(o).every(k=>allowed.includes(k));
 function parse(raw,now=Date.now()){
  if(!obj(raw)||!keys(raw,['version','createdAt','stage','tool','values','checks'])||Object.keys(raw).length!==6||raw.version!==1||!Number.isSafeInteger(raw.createdAt)||raw.createdAt>now+5000||now-raw.createdAt>1800000||!(raw.stage===null||stages.includes(raw.stage))||!tools.includes(raw.tool)||!obj(raw.values)||!Array.isArray(raw.checks))return null;
  const rule=schema[raw.tool],values=Object.create(null);
  for(const [k,v] of Object.entries(raw.values)){if(!own(rule,k)||!Number.isFinite(v)||v<rule[k][0]||v>rule[k][1]||(rule[k][2]!=='percent'&&!Number.isSafeInteger(v)))return null;values[k]=v}
  const isCheck=raw.tool==='check'||raw.tool==='contractCheck';
  if(raw.checks.length>5||new Set(raw.checks).size!==raw.checks.length||raw.checks.some(v=>!Number.isInteger(v)||v<0||v>=5)||(!isCheck&&raw.checks.length))return null;
  return {version:1,createdAt:raw.createdAt,stage:raw.stage,tool:raw.tool,values,checks:raw.checks.slice()};
 }
 function pack(t,st,picked,values,touched,checks,now=Date.now()){
  if(!tools.includes(t))return null;const isCheck=t==='check'||t==='contractCheck',out=Object.create(null);
  if(!isCheck)for(const [k,rule] of Object.entries(schema[t]))if(touched.has(t+'.'+k)&&Number.isFinite(values?.[k])){const v=values[k],isMan=rule[2]==='yen'&&!(k==='price');const normalized=isMan?Math.round(v*10000):v;if(Number.isFinite(normalized))out[k]=normalized}
  return parse({version:1,createdAt:now,stage:picked?st:null,tool:t,values:out,checks:isCheck?[...checks].sort((a,b)=>a-b):[]},now);
 }
 return Object.freeze({pack,parse});
})();
export default HANDOFF;
