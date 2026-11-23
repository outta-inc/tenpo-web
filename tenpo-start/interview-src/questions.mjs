// TENPO/START interview v1.0 — source of wording, order and branches.
// This module performs no network, storage or plan writes.
export const VERSION = '1.0.0';
const choices = entries => entries.map(([value,label]) => ({value,label}));
const select = (id,label,entries,extra={}) => ({id,label,type:'select',options:choices(entries),...extra});
const text = (id,label,example,extra={}) => ({id,label,type:'text',example,maxLength:600,...extra});
const number = (id,label,unit,example,min=1,extra={}) => ({id,label,type:'number',unit,example,min,integer:true,...extra});
export const BUSINESSES = choices([
 ['cafe','カフェ'],['restaurant','レストラン・食堂・定食屋'],['bar','居酒屋・バー'],
 ['cake','ケーキ屋・菓子店'],['takeaway','持ち帰りの店'],['salon','サロン'],['other','ほかの業態']
]);
export const CORE = [
 {id:'businessType',label:'どんなお店を開きたいですか',type:'select',options:BUSINESSES},
 select('salesModel','売上は、どの形で考えると近いですか',[
  ['seated','席で過ごしてもらう店'],['takeaway','持ち帰ってもらう店'],['salon','予約枠で施術する店']
 ],{branch:'chooseModel',help:'両方ある場合は、最初に中心となる方を選びます。もう一方の売上は自動で足しません。'}),
 select('experience','お店を開いた経験はありますか',[
  ['first','初めて開く'],['worked','働いた経験はあるが、開くのは初めて'],
  ['opened','開業したことがある'],['operating','今もお店を運営している']
 ]),
 text('purpose','どんな場面で来てもらいたいですか','近所の人が、昼食や午後の休憩に立ち寄る',{
  examples:{takeaway:'仕事帰りに夕食を持ち帰る',salon:'仕事帰りに体を休めたい時'}}),
 text('mainProduct','中心の商品は何にしたいですか','コーヒーと温かいサンドイッチ',{
  salonLabel:'中心のメニューは何にしたいですか',examples:{takeaway:'手土産のケーキ',salon:'60分のもみほぐし'}}),
 number('capacity','席数は、いくつで考えていますか','席',12,1,{max:200,branch:'notTakeaway',
  salonLabel:'同時に使える施術の席やベッドは、いくつですか',salonUnit:'台',salonExample:2,
  help:'まだ物件が決まっていなくても、仮で書けます。持ち帰りだけの場合は、前の画面で店の形を変えます。'}),
 number('averageSpendYen','1人が1回に使う金額は、いくらで考えていますか','円',1100,1,{
  takeawayLabel:'1組が1回の会計で使う金額は、いくらで考えていますか',
  salonLabel:'中心のメニューの料金は、いくらで考えていますか',salonExample:8000,
  help:'飲食は1人分、持ち帰りは1会計分、サロンは1人1回分です。1品の値段と取り違えないようにします。'}),
 number('serviceMinutes','中心のメニューの施術時間は何分ですか','分',60,1,{branch:'salon',
  help:'準備や片付けの時間は別に考えます。30分・45分なども自由に書けます。'}),
 number('peakStaff','いちばん混む時間は、何人で営業しますか（自分を入れて）','人',2,1,{
  salonLabel:'いちばん混む時間に、同時に施術する人は何人ですか（自分を入れて）',
  help:'店主を数えた合計です。サロンは受付だけの人を含めません。家族か雇う人かは、ここから決めつけません。'}),
 select('propertyStage','物件探しは、どこまで進んでいますか',[
  ['idea','まだ構想中'],['area','エリアを検討中'],['viewing','候補を内見中'],
  ['contracted','契約済み'],['existing','今の物件を使う']
 ]),
 {id:'priorities',label:'大切にしたいことと、調整できることを分けてみましょう',type:'group',fields:[
  text('mustKeep','大切にしたいこと','夕方には営業を終えること'),
  text('canAdjust','調整できること','メニュー数と手作りの範囲')
 ]}
];
export const OPTIONAL = [
 text('openingTarget','いつごろ開きたいですか','来年の秋ごろ'),
 text('area','どの辺りで考えていますか','住宅街。エリアは未定'),
 text('businessHours','営業したい時間は何時から何時までですか','10時〜17時'),
 text('workingHours','準備や片付けを含め、仕事に使える時間はどのくらいですか','9時〜18時。準備にかかる時間は、これから確かめる'),
 number('daysOffPerWeek','週に何日、休みたいですか','日',1,0,{max:7}),
 text('operators','だれが、どんな時間に運営しますか','店主1人を基本に、昼だけ補助を頼む'),
 number('helperHoursPerDay','補助を頼む時間は、1日何時間で考えていますか','時間',3,0,{integer:false,max:24,branch:'helper'}),
 number('ownFundsYen','自分で用意できるお金は、いくらですか','円',2000000,0,{private:true}),
 number('desiredMonthlyTakeHomeYen','毎月、あなたの生活に要る額（給料）はいくらですか','円',250000,0,{private:true}),
 // ---- ここから5問は Claude が追加（2026/11/21、松尾さんの指示）。計画の「仮」を本人の答えに替えるための任意の質問。
 text('shopName','店名は決まっていますか。仮の名前でも書けます','まだ仮で「◯◯珈琲」',{maxLength:60}),
 text('motive','お店を始めたいと思った理由を、ひとことで残してください','近所に、1人でも落ち着ける場所をつくりたい'),
 number('guestsPerDay','1日に、何人くらいに来てほしいですか','人',36,1,{branch:'hasModel',
  takeawayLabel:'1日に、何組くらいの会計を見込みますか',takeawayUnit:'組',takeawayExample:30,
  salonLabel:'1日に、何人くらいの予約を見込みますか',salonExample:4,
  help:'まだ分からなければ「まだ決めていない」で進めます。書いた数は、計画の中で仮の見込みとして使います。'}),
 number('candidateRentYen','気になっている物件の家賃は、月いくらですか（共益費込み）','円',180000,0,{branch:'hasProperty',
  help:'候補がいくつかある時は、いちばん気になっている1つで書きます。'}),
 select('borrowPlan','開業のために、お金を借りる予定はありますか',[
  ['yes','借りる予定'],['maybe','借りるかもしれない'],['no','借りない予定']]),
 text('worry','今、いちばん気になっていることは何ですか','何から手をつければよいか迷っている'),
 text('existingEvidence','今の店で確かめたことがあれば、残してください','客単価1,100円。直近4週間の記録。新しい場所でも同じかは未定',{branch:'experienced'})
];
export const ACTIONS = {next:'次へ',back:'戻る',unknown:'まだ決めていない',skip:'今は飛ばす',
 decline:'答えない',review:'ここまでの答えを見る',finish:'この内容を残す',more:'分かることをもう少し書く',
 provisional:'仮で置く',confirmed:'確かめた内容',voice:'キーボードの音声入力も使えます'};
export const ALL = [...CORE,...OPTIONAL];
export function valueOf(state,id){const a=state.answers[id];return ['answered','provisional'].includes(a?.status)?a.value:null;}
export function modelOf(state){
 const b=valueOf(state,'businessType');
 if(['cafe','restaurant','bar'].includes(b))return 'seated';
 if(b==='takeaway')return 'takeaway';
 if(b==='salon')return 'salon';
 return ['cake','other'].includes(b)?valueOf(state,'salesModel'):null;
}
export function isActive(q,state){const model=modelOf(state),b=valueOf(state,'businessType');
 switch(q.branch){
  case 'chooseModel':return ['cake','other'].includes(b);
  case 'salon':return model==='salon';
  case 'notTakeaway':return ['seated','salon'].includes(model);
  case 'helper':return model!=='salon' && valueOf(state,'peakStaff')>1;
  case 'experienced':return ['opened','operating'].includes(valueOf(state,'experience'));
  case 'hasModel':return model!==null;
  case 'hasProperty':return ['viewing','contracted','existing'].includes(valueOf(state,'propertyStage'));
  default:return true;
 }
}
export function questionsFor(state,{optional=false}={}){return (optional?OPTIONAL:CORE).filter(q=>isActive(q,state)).map(q=>{
 const model=modelOf(state);return {...q,label:q[model+'Label']||q.label,unit:q[model+'Unit']||q.unit,
 example:q[model+'Example']??q.examples?.[model]??q.example,
 options:q.id==='salesModel'&&valueOf(state,'businessType')==='cake'?q.options.filter(o=>o.value!=='salon'):q.options};
});}
