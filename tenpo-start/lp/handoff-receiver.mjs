const LP_RECEIVER=(()=>{
 const ST={idea:'構想中',search:'物件を探している',apply:'物件が決まりそう',contract:'物件が決まった',prep:'開店の準備中',open:'開店した'};
 const TOOL={sales:'売上試算',property:'物件の採算判断',capital:'開業資金',review:'開店後の振り返り',check:'開店前の準備',contractCheck:'契約前の確認'};
 const LABEL={price:'客単価',guests:'1日の想定客数',days:'月の営業日',rent:'月の家賃',rate:'変動費率（合計）',fixed:'家賃以外の固定費',owner:'手元に残したい額',property:'物件費用',build:'内装・工事',equip:'機器・備品',other:'開店前のその他費用',reserve:'続けるためのお金（総額）',own:'自己資金',planned:'計画した月売上',actual:'実際の月売上'};
 function display(k,v){return k==='guests'?v+'人':k==='days'?v+'日':k==='rate'?v+'%':v.toLocaleString('ja-JP')+'円'}
 function has(p,k){return Object.prototype.hasOwnProperty.call(p.values,k)}
 function empty(input){return !!input&&!input.disabled&&String(input.value).trim()===''}
 function fill(input,value){if(!empty(input))return false;input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));return true}
 function install({doc,root,packet,parse,storage,bridge,protectedAtEntry,protectedNow,priceFields,canOpenRent,openRent}){
  if(!root||!packet)return null;
  let active=true,expanded=false,observer=null;
  const guarded=()=>protectedAtEntry||protectedNow();
  const el=(t,txt='',cls='')=>{const n=doc.createElement(t);n.textContent=txt;if(cls)n.className=cls;return n};
  function dismiss(){active=false;bridge.clear(storage);observer?.disconnect();doc.getElementById('lp-receipt')?.remove()}
  function current(){const p=parse(packet);if(!p){dismiss();return null}return p}
  function actions(p){const box=el('div','','lp-receipt-actions');
   if(guarded())return box;
   if(has(p,'price')&&p.values.price>0)for(const item of priceFields())if(empty(item.input)){
    const b=el('button','客単価 '+display('price',p.values.price)+(item.label?'を'+item.label+'に':'を')+'入れる','btn ghost');b.type='button';b.onclick=()=>{if(current()&&!guarded()&&priceFields().some(x=>x.input===item.input)&&fill(item.input,p.values.price)){b.disabled=true;b.textContent='入力しました。内容を確認して次へ'}};box.append(b);
   }
   if(has(p,'rent')&&p.values.rent>0&&canOpenRent()){
    const b=el('button','家賃 '+display('rent',p.values.rent)+'で試す','btn ghost');b.type='button';b.onclick=()=>{if(!current()||guarded()||!canOpenRent())return;const input=openRent();if(input&&fill(input,p.values.rent/10000))input.focus()};box.append(b);
   }return box;
  }
  function draw(){if(!active||doc.getElementById('lp-receipt'))return;const p=current();if(!p)return;const target=root.querySelector('.wrap')||root;if(!target.children.length)return;
   const section=el('section','','card lp-receipt');section.id='lp-receipt';section.setAttribute('aria-label','LPの試算メモ');const details=el('details');details.open=expanded;details.addEventListener('toggle',()=>{expanded=details.open});
   const summary=el('summary','LPの試算メモを持ってきました'+(Object.keys(p.values).length+p.checks.length?'（'+(Object.keys(p.values).length+p.checks.length)+'件）':''));details.append(summary);
   details.append(el('p',TOOL[p.tool]+(p.stage?' ／ '+ST[p.stage]:''),'lp-receipt-sub'));
   const rows=el('div','','lp-receipt-rows');for(const [k,v] of Object.entries(p.values)){const row=el('div','','lp-receipt-row');row.append(el('span',LABEL[k]),el('b',display(k,v)));rows.append(row)}
   if(p.checks.length)rows.append(el('p','確認候補 '+p.checks.length+'件（実際に済んだ項目とは別です）','lp-receipt-sub'));
   if(!rows.children.length)rows.append(el('p','入力済みの数字はありません。仮の数字は引き継いでいません。','lp-receipt-sub'));
   details.append(rows,el('p',guarded()?'今の計画は変えません。試算は参考として見られます。':'必要な数字を、対応する画面で確認しながら使えます。','lp-receipt-sub'));
   const close=el('button','試算メモを閉じる','lk');close.type='button';close.onclick=dismiss;details.append(close);section.append(details,actions(p));target.prepend(section);
  }
  observer=new MutationObserver(draw);observer.observe(root,{childList:true});draw();
  return Object.freeze({draw,dismiss});
 }
 return Object.freeze({install,fill,empty,display});
})();
export default LP_RECEIVER;
