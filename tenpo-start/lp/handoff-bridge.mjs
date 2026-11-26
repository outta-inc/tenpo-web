const LP_BRIDGE=(()=>{
 const KEY='tenpo-start:lp-handoff:v1';
 const ENABLED=false; // only change with explicit release approval, on both surfaces
 const loopback=l=>['localhost','127.0.0.1','[::1]'].includes(l.hostname)&&l.protocol==='http:';
 const production=l=>l.origin==='https://start.tenpo-os.com';
 function destination(l){
  const q=new URLSearchParams(l.search);
  if(loopback(l)&&q.get('bridge')==='preview')return '/app-preview.html?from=lp';
  if(ENABLED&&production(l)&&/^\/lp\/?$/.test(l.pathname))return '/?from=lp';
  return null;
 }
 function accepts(l){
  if(new URLSearchParams(l.search).get('from')!=='lp')return false;
  return (loopback(l)&&l.pathname==='/app-preview.html')||(ENABLED&&production(l)&&l.pathname==='/');
 }
 function put(storage,packet,parse,now=Date.now()){
  const p=parse(packet,now);if(!p)return false;
  try{storage.setItem(KEY,JSON.stringify(p));return true}catch(e){return false}
 }
 function clear(storage){try{storage.removeItem(KEY)}catch(e){}}
 function take(storage,parse,now=Date.now()){
  try{const raw=storage.getItem(KEY);if(raw==null)return null;
   const p=raw.length<=12000?parse(JSON.parse(raw),now):null;
   if(!p)clear(storage);return p;
  }catch(e){clear(storage);return null}
 }
 return Object.freeze({KEY,destination,accepts,put,take,clear});
})();
export default LP_BRIDGE;
