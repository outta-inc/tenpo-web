// TENPO/START interview v1.0 — source of wording, order and branches.
// This module performs no network, storage or plan writes.
export const VERSION = '1.0.0';
const choices = entries => entries.map(([value,label]) => ({value,label}));
const select = (id,label,entries,extra={}) => ({id,label,type:'select',options:choices(entries),...extra});
const text = (id,label,example,extra={}) => ({id,label,type:'text',example,maxLength:600,...extra});
const number = (id,label,unit,example,min=1,extra={}) => ({id,label,type:'number',unit,example,min,integer:true,...extra});
// 2026/11/23：大項目（category）→ 中項目（businessType）の2段階に。大項目で計算の形が決まる。
// 中項目の古い値（takeaway・salon）は、前に保存した答えを読めるように残し、新しい選択肢には出さない（hidden）。
export const CATEGORIES = choices([
 ['seated','席で食べる・飲む店'],['takeaway','持ち帰り・物販の店'],['salon','施術・サロン'],['other','ほかの業態']
]);
export const BUSINESSES = [
 ['cafe','カフェ・喫茶','seated'],['noodle','ラーメン・カレー・そばなどの専門店','seated'],
 ['restaurant','食堂・定食屋・レストラン','seated'],['bistro','予約が中心のレストラン・ビストロ','seated'],
 ['izakaya','居酒屋','seated'],['bar','バー・スナック','seated'],
 ['bento','弁当・惣菜','takeaway'],['cake','パン・ケーキ・菓子','takeaway'],
 ['stand','コーヒーやドリンクのスタンド','takeaway'],['retail','雑貨・花などの物販','takeaway'],
 ['relax','リラクゼーション・整体','salon'],['hair','美容室・理容室','salon'],
 ['nail','ネイル・まつげ','salon'],['esthe','エステ','salon'],
 ['other','ほかの業態','other'],
 ['takeaway','持ち帰りの店','takeaway',true],['salon','サロン','salon',true]
].map(([value,label,category,hidden])=>({value,label,category,...(hidden?{hidden:true}:{})}));
export const categoryOf = v => (BUSINESSES.find(o=>o.value===v)||{}).category ?? null;
export const CORE = [
 {id:'category',label:'どんなお店を開きたいですか',type:'select',options:CATEGORIES,
  help:'カフェでも、持ち帰りが中心なら「持ち帰り・物販の店」を選びます。'},
 {id:'businessType',label:'いちばん近いものはどれですか',type:'select',options:BUSINESSES,branch:'notOther',
  help:'ぴったりの物が無ければ、いちばん近いものを選びます。'},
 select('salesModel','売上は、どの形で考えると近いですか',[
  ['seated','席で過ごしてもらう店'],['takeaway','持ち帰ってもらう店'],['salon','予約枠で施術する店']
 ],{branch:'chooseModel',help:'両方ある場合は、最初に中心となる方を選びます。もう一方の売上は自動で足しません。'}),
 select('experience','お店を開いた経験はありますか',[
  ['first','初めて開く'],['worked','働いた経験はあるが、開くのは初めて'],
  ['opened','開業したことがある'],['operating','今もお店を運営している']
 ]),
 // 2026/11/23：今もお店を運営している人にだけ、今のお店の実績を聞く。新しいお店の仮の数字の代わりに「今のお店の実績」として使う。
 number('existingGuestsPerDay','今のお店には、1日に何人くらい来ていますか（ならした数）','人',40,0,{branch:'operating',max:2000,
  takeawayLabel:'今のお店では、1日に何件くらいの会計がありますか（ならした数）',takeawayUnit:'件',
  salonLabel:'今のお店では、1日に何人くらいの予約がありますか（ならした数）',salonExample:5,
  help:'分かる範囲で大丈夫です。新しいお店でも同じになるとは限らないので、仮の見込みとして使います。'}),
 number('existingSeats','今のお店の席数は、いくつですか','席',12,1,{branch:'operatingSeats',max:200,
  salonLabel:'今のお店の施術の席やベッドは、いくつですか',salonUnit:'台',salonExample:2}),
 number('existingDaysPerMonth','今のお店は、月に何日開けていますか','日',26,1,{branch:'operating',max:31}),
 number('existingCostRatePct','今のお店の原価率は、何%くらいですか','%',30,0,{branch:'operating',max:100,
  salonLabel:'今のお店の材料費は、売上の何%くらいですか',salonExample:10}),
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
 select('selfWork','あなた自身も、お店で働きますか',[['yes','自分もお店で働く'],['no','人に任せる']],{
  help:'あなたの給料は人件費に入りません。働くかどうかで、続けるのに要る人数が変わります。'}),
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
 select('openingWhen','いつごろ開きたいですか',[['m3','3か月以内'],['m6','半年くらい先'],['m12','1年くらい先'],['m18','1年より先']],{
  help:'目安で大丈夫です。開店日の目安にして、やることの期限を出します。あとで日付に直せます。'}),
 text('openingTarget','いつごろ開きたいですか','来年の秋ごろ',{branch:'retired'}),
 text('area','どの辺りで考えていますか','住宅街。エリアは未定'),
 text('businessHours','営業したい時間は何時から何時までですか','10時〜17時'),
 text('workingHours','準備や片付けを含め、仕事に使える時間はどのくらいですか','9時〜18時。準備にかかる時間は、これから確かめる'),
 number('daysOffPerWeek','週に何日、休みたいですか','日',1,0,{max:7}),
 text('operators','だれが、どんな時間に運営しますか','店主1人を基本に、昼だけ補助を頼む',{branch:'retired'}),
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
// 前の版の答え（大項目が無く、ケーキ屋・ほかの業態で売上の形を選んだ人）は、前のとおりに読む。
export const legacyChoose = state => valueOf(state,'category')===null && ['cake','other'].includes(valueOf(state,'businessType'));
export function categorySelected(state){const c=valueOf(state,'category');if(c)return c;
 const b=valueOf(state,'businessType');return b&&!legacyChoose(state)?categoryOf(b):null;}
export function modelOf(state){
 if(legacyChoose(state))return valueOf(state,'salesModel');
 const c=categorySelected(state);
 if(c==='other')return valueOf(state,'salesModel');
 return c;
}
export function isActive(q,state){const model=modelOf(state),b=valueOf(state,'businessType');
 switch(q.branch){
  case 'chooseModel':return valueOf(state,'category')==='other'||legacyChoose(state);
  case 'notOther':return valueOf(state,'category')!=='other';
  case 'operating':return valueOf(state,'experience')==='operating';
  case 'operatingSeats':return valueOf(state,'experience')==='operating'&&['seated','salon'].includes(model);
  case 'retired':return false;
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
 options:q.id==='salesModel'&&legacyChoose(state)&&valueOf(state,'businessType')==='cake'?q.options.filter(o=>o.value!=='salon')
  :q.id==='businessType'?q.options.filter(o=>!o.hidden&&o.category!=='other'&&(!valueOf(state,'category')||o.category===valueOf(state,'category'))):q.options};
});}
