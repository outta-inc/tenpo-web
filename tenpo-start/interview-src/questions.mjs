// TENPO/START interview v1.0 — source of wording, order and branches.
// This module performs no network, storage or plan writes.
// 2026/11/24：初回は5問（今お店をしているか／業態／曜日と時間帯・あなたが立つか／金額／席数）に絞った。
// それ以外の質問は、役に立つ場面（追加の質問・計算のもと・開業資金）へ移した。前に保存した答えも読めるよう、
// 使わなくなった質問は branch:'retired'、使わなくなった選択肢は hidden で残している。
export const VERSION = '1.0.0';
const choices = entries => entries.map(([value,label,hidden]) => ({value,label,...(hidden?{hidden:true}:{})}));
const select = (id,label,entries,extra={}) => ({id,label,type:'select',options:choices(entries),...extra});
const text = (id,label,example,extra={}) => ({id,label,type:'text',example,maxLength:600,...extra});
const number = (id,label,unit,example,min=1,extra={}) => ({id,label,type:'number',unit,example,min,integer:true,...extra});
// 大項目（category）→ 中項目（businessType）。計算の形（model）は中項目で決まる。
export const CATEGORIES = [
 ['food','飲食店','カフェ、食堂、レストラン、居酒屋、バー'],
 ['takeaway','持ち帰り・物販','弁当、パン・菓子、ドリンクスタンド、花、雑貨'],
 ['beauty','美容・施術','美容室、ネイル、エステ、整体、整骨院、鍼灸'],
 ['school','教室・運動','学習塾、料理教室、ヨガ、パーソナルジム'],
 ['space','場所貸し','レンタルスペース、撮影スタジオ、ギャラリー'],
 ['life','暮らし・ペット','ペットサロン、ペットホテル'],
 // 前の版の大項目（読み込み用）
 ['seated','席で食べる・飲む店',null,true],['salon','施術・サロン',null,true],['other','ほかの業態',null,true]
].map(([value,label,desc,hidden])=>({value,label,...(desc?{desc}:{}),...(hidden?{hidden:true}:{})}));
// [値, 表示, 大項目, 計算の形, 隠す]
export const BUSINESSES = [
 ['cafe','カフェ・喫茶','food','seated'],['noodle','ラーメン・カレー・そばなどの専門店','food','seated'],
 ['restaurant','食堂・定食屋・レストラン','food','seated'],['bistro','予約が中心のレストラン・ビストロ','food','seated'],
 ['izakaya','居酒屋','food','seated'],['bar','バー・スナック','food','seated'],
 ['bento','弁当・惣菜','takeaway','takeaway'],['cake','パン・ケーキ・菓子','takeaway','takeaway'],
 ['stand','コーヒーやドリンクのスタンド','takeaway','takeaway'],['retail','雑貨・花などの物販','takeaway','takeaway'],
 ['hair','美容室・理容室','beauty','salon'],['nail','ネイル・まつげ','beauty','salon'],
 ['esthe','エステ','beauty','salon'],['relax','リラクゼーション・もみほぐし','beauty','salon'],
 ['seitai','整体','beauty','salon'],['seikotsu','整骨院・接骨院','beauty','salon'],['shinkyu','鍼灸院','beauty','salon'],
 ['juku','学習塾','school','salon'],['cooking','料理教室','school','salon'],
 ['yoga','ヨガ・ピラティス','school','salon'],['gym','パーソナルジム','school','salon'],
 ['rental','レンタルスペース','space','salon'],['studio','撮影スタジオ','space','salon'],['gallery','ギャラリー','space','salon'],
 ['petsalon','ペットサロン（トリミング）','life','salon'],['pethotel','ペットホテル・預かり','life','salon'],
 // 前の版の中項目（読み込み用）
 ['other','ほかの業態','other',null,true],['takeaway','持ち帰りの店','takeaway','takeaway',true],['salon','サロン','beauty','salon',true]
].map(([value,label,category,model,hidden])=>({value,label,category,model,...(hidden?{hidden:true}:{})}));
// 前の版の大項目を、今の大項目に読み替える
export const CAT_NOW = {seated:'food',salon:'beauty'};
const catNow = c => CAT_NOW[c] || c;
export const categoryOf = v => (BUSINESSES.find(o=>o.value===v)||{}).category ?? null;
const bizModel = v => (BUSINESSES.find(o=>o.value===v)||{}).model ?? null;
// 大項目だけ決まっている時の計算の形
const CAT_MODEL = {food:'seated',seated:'seated',takeaway:'takeaway',beauty:'salon',salon:'salon',school:'salon',space:'salon',life:'salon'};
// 業態ごとの言葉（「席」「施術」などが合わない業態のため）
export const UNIT_WORDS = {
 seated:{cap:'何席くらいのお店を考えていますか？',capUnit:'席',capShort:'席数',price:'お客さん1人が、1回に使う金額はいくらくらいですか？',priceShort:'1人あたりの金額'},
 takeaway:{price:'1回の会計は、いくらくらいですか？',priceShort:'1会計の金額'},
 beauty:{cap:'施術の席やベッドは、何台くらいですか？',capUnit:'台',capShort:'施術の台数',price:'中心のメニュー1回の料金は、いくらくらいですか？',priceShort:'1回の料金'},
 school:{cap:'1回に、何人まで受けられますか？',capUnit:'人',capShort:'1回の人数',price:'1人1回あたりの料金は、いくらくらいですか？',priceShort:'1人1回の料金',note:'月謝で受ける場合も、まずは1回あたりにならして考えます。'},
 space:{cap:'貸し出す部屋・区画は、いくつですか？',capUnit:'室',capShort:'部屋・区画の数',price:'1回の貸し出しは、いくらくらいですか？',priceShort:'1回の貸し出しの金額'},
 // 2026/11/25：教室・運動で「月謝・月額の会員制」を選んだ人は、金額を月額で聞き、会員の数で計算する
 monthly:{price:'1人の月謝（月額）は、いくらくらいですか？',priceShort:'月額',note:'月に何回来てもらうかは、あとで「計算のもと」で直せます。'},
 life:{cap:'同時に受けられるのは、何頭（何件）ですか？',capUnit:'件',capShort:'同時に受けられる数',price:'1回の料金は、いくらくらいですか？',priceShort:'1回の料金'}
};
export const DAYS = ['月','火','水','木','金','土','日'];
// 曜日×昼夜の型。値は曜日ごとの [昼, 夜]（0=休み、1=開ける・自分が立つ、2=開ける・人に任せる）
export const WEEK_PRESETS = [
 ['weekdayBoth','平日の昼と夜',d=>d<5?[1,1]:[0,0]],
 ['nightly','毎日、夜だけ',()=>[0,1]],
 ['weekdayLunch','平日の昼だけ',d=>d<5?[1,0]:[0,0]],
 ['allBoth','土日も含めて昼と夜（日曜休み）',d=>d<6?[1,1]:[0,0]],
 ['monSatLunchSatNight','月〜土の昼と、土曜の夜',d=>d<6?[1,d===5?1:0]:[0,0]]
];
export const OWNER_MODES = choices([['all','営業中はすべて自分'],['lunch','昼だけ自分'],['none','人に任せる'],['custom','曜日ごとに決める']]);
export const CORE = [
 select('experience','今、お店をしていますか？',[
  ['first','初めて開く'],['operating','今お店をしている'],
  ['worked','働いた経験はあるが、開くのは初めて',true],['opened','開業したことがある',true]
 ],{help:'今お店をしている方には、今のお店の数字を先に聞きます。新しいお店の仮の数字の代わりに使います。'}),
 // 今もお店を運営している人にだけ、今のお店の実績を聞く。
 number('existingGuestsPerDay','今のお店には、1日に何人くらい来ていますか（ならした数）','人',40,0,{branch:'operating',max:2000,
  takeawayLabel:'今のお店では、1日に何件くらいの会計がありますか（ならした数）',takeawayUnit:'件',
  salonLabel:'今のお店では、1日に何人くらいの予約がありますか（ならした数）',salonExample:5,
  help:'分かる範囲で大丈夫です。新しいお店でも同じになるとは限らないので、仮の見込みとして使います。'}),
 number('existingSeats','今のお店の席数は、いくつですか','席',12,1,{branch:'operatingSeats',max:200,
  salonLabel:'今のお店の施術の席やベッドは、いくつですか',salonUnit:'台',salonExample:2}),
 number('existingDaysPerMonth','今のお店は、月に何日開けていますか','日',26,1,{branch:'operating',max:31}),
 number('existingCostRatePct','今のお店の原価率は、何%くらいですか','%',30,0,{branch:'operating',max:100,
  salonLabel:'今のお店の材料費は、売上の何%くらいですか',salonExample:10}),
 {id:'category',label:'どんなお店を開きたいですか？',type:'select',options:CATEGORIES,
  help:'近いものを選んでください。あとで変えられます。'},
 {id:'businessType',label:'いちばん近いものはどれですか？',type:'select',options:BUSINESSES,branch:'notOther',inline:true,
  help:'ぴったりの物が無ければ、いちばん近いものを選びます。'},
 select('salesModel','売上は、どの形で考えると近いですか',[
  ['seated','席で過ごしてもらう店'],['takeaway','持ち帰ってもらう店'],['salon','予約枠で施術する店']
 ],{branch:'chooseModel',help:'両方ある場合は、最初に中心となる方を選びます。'}),
 // 2026/11/25：教室・運動だけ。月謝・会員制なら「会員の数 × 月額」で計算する
 select('feeModel','料金は、どの形で受け取りますか？',[['visit','1回ごと（回数券を含む）'],['monthly','月謝・月額の会員制']],{branch:'school',
  help:'会員制なら、売上は「会員の数 × 月額」で考えます。両方ある場合は、中心になる方を選びます。'}),
 {id:'schedule',label:'何曜日の、どの時間帯に開けますか？',type:'week',
  help:'近い形を選んでから、曜日ごとに直せます。開けた時間に、あなたがお店に立つかも決めます。'},
 select('otherBand','もう一方の時間帯は、条件が合えば開けてもよいですか？',[['no','開けられない'],['maybe','条件が合えば'],['unk','まだ分からない']],{branch:'oneBand',inline:true}),
 number('averageSpendYen','お客さん1人が、1回に使う金額はいくらくらいですか？','円',1100,1,{
  help:'時間帯で違えば、分けて入れてください。持ち帰りは1会計あたり、サロンは施術1回あたりの金額です。'}),
 number('secondSpendYen','もう一方の時間帯の金額','円',1100,1,{branch:'twoBands',inline:true}),
 number('capacity','何席くらいのお店を考えていますか？','席',12,1,{max:200,branch:'notTakeaway',
  help:'物件を見て決めたい場合は「まだ決めていない」で進めて大丈夫です。'}),
 // ---- 前の版の基本の質問（今は聞かない。保存した答えは読む）
 number('peakStaff','いちばん混む時間は、何人で営業しますか（自分を入れて）','人',2,1,{branch:'retired'}),
 select('selfWork','あなた自身も、お店で働きますか',[['yes','自分もお店で働く'],['no','人に任せる']],{branch:'retired'})
];
export const OPTIONAL = [
 text('purpose','どんな場面で来てもらいたいですか','近所の人が、昼食や午後の休憩に立ち寄る',{
  examples:{takeaway:'仕事帰りに夕食を持ち帰る',salon:'仕事帰りに体を休めたい時'}}),
 text('mainProduct','中心の商品は何にしたいですか','コーヒーと温かいサンドイッチ',{
  salonLabel:'中心のメニューは何にしたいですか',examples:{takeaway:'手土産のケーキ',salon:'60分のもみほぐし'}}),
 number('serviceMinutes','中心のメニューは、1回何分ですか','分',60,1,{branch:'salon',
  help:'準備や片付けの時間は別に考えます。分からなければ、60分で仮に計算します。'}),
 select('propertyStage','物件探しは、どこまで進んでいますか',[
  ['idea','まだ構想中'],['area','エリアを検討中'],['viewing','候補を内見中'],
  ['contracted','契約済み'],['existing','今の物件を使う']
 ]),
 {id:'priorities',label:'大切にしたいことと、調整できることを分けてみましょう',type:'group',fields:[
  text('mustKeep','大切にしたいこと','夕方には営業を終えること'),
  text('canAdjust','調整できること','メニュー数と手作りの範囲')
 ]},
 select('openingWhen','いつごろ開きたいですか',[['m3','3か月以内'],['m6','半年くらい先'],['m12','1年くらい先'],['m18','1年より先']],{
  help:'目安で大丈夫です。開店日の目安にして、やることの期限を出します。あとで日付に直せます。'}),
 text('openingTarget','いつごろ開きたいですか','来年の秋ごろ',{branch:'retired'}),
 text('area','どの辺りで考えていますか','住宅街。エリアは未定'),
 text('businessHours','営業したい時間は何時から何時までですか','10時〜17時'),
 text('workingHours','準備や片付けを含め、仕事に使える時間はどのくらいですか','9時〜18時。準備にかかる時間は、これから確かめる'),
 number('daysOffPerWeek','週に何日、休みたいですか','日',1,0,{max:7,branch:'retired'}),
 text('operators','だれが、どんな時間に運営しますか','店主1人を基本に、昼だけ補助を頼む',{branch:'retired'}),
 number('helperHoursPerDay','補助を頼む時間は、1日何時間で考えていますか','時間',3,0,{integer:false,max:24,branch:'retired'}),
 number('ownFundsYen','自分で用意できるお金は、いくらですか','円',2000000,0,{private:true}),
 number('desiredMonthlyTakeHomeYen','毎月、あなたの生活に要る額（給料）はいくらですか','円',250000,0,{private:true,branch:'retired'}),
 text('shopName','店名は決まっていますか。仮の名前でも書けます','まだ仮で「◯◯珈琲」',{maxLength:60}),
 text('motive','お店を始めたいと思った理由を、ひとことで残してください','近所に、1人でも落ち着ける場所をつくりたい'),
 number('guestsPerDay','1日に、何人くらいに来てほしいですか','人',36,1,{branch:'retired'}),
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
export const legacyChoose = state => valueOf(state,'category')===null && ['cake','other'].includes(valueOf(state,'businessType')) && valueOf(state,'salesModel')!==null;
export function categorySelected(state){const c=valueOf(state,'category');if(c)return catNow(c);
 const b=valueOf(state,'businessType');return b&&!legacyChoose(state)?categoryOf(b):null;}
export function modelOf(state){
 if(legacyChoose(state))return valueOf(state,'salesModel');
 const c=categorySelected(state);
 if(c==='other')return valueOf(state,'salesModel');
 const b=valueOf(state,'businessType'),bm=b?bizModel(b):null;
 if(bm&&categoryOf(b)===c)return bm;
 return CAT_MODEL[c]??null;
}
// 言葉の種類（席・台・人・室など）
export const isMonthly = state => categorySelected(state)==='school' && valueOf(state,'feeModel')==='monthly';
export function wordsOf(state){const c=categorySelected(state),m=modelOf(state);
 if(c&&UNIT_WORDS[c])return {...UNIT_WORDS[m==='takeaway'?'takeaway':m==='seated'?'seated':'beauty'],...UNIT_WORDS[c],...(isMonthly(state)?UNIT_WORDS.monthly:{})};
 return UNIT_WORDS[m==='salon'?'beauty':m||'seated'];}
// 曜日の表の集計
export function weekStats(w){const z={days:0,l:0,d:0,me:0,st:0,lme:0,dme:0,lst:0,dst:0};if(!Array.isArray(w))return null;
 w.forEach(([l,d])=>{if(l||d)z.days++;[['l',l],['d',d]].forEach(([t,v])=>{if(!v)return;z[t]++;if(v===1){z.me++;z[t+'me']++}else{z.st++;z[t+'st']++}})});return z;}
export function isActive(q,state){const model=modelOf(state),w=weekStats(valueOf(state,'schedule'));
 switch(q.branch){
  case 'chooseModel':return valueOf(state,'category')==='other'||legacyChoose(state);
  case 'notOther':return valueOf(state,'category')!=='other';
  case 'operating':return valueOf(state,'experience')==='operating';
  case 'operatingSeats':return valueOf(state,'experience')==='operating'&&['seated','salon'].includes(model);
  case 'retired':return false;
  case 'salon':return model==='salon';
  case 'school':return categorySelected(state)==='school';
  case 'notTakeaway':return model!=='takeaway';
  case 'experienced':return ['opened','operating'].includes(valueOf(state,'experience'));
  case 'hasModel':return model!==null;
  case 'hasProperty':return ['viewing','contracted','existing'].includes(valueOf(state,'propertyStage'));
  case 'twoBands':return !!w&&w.l>0&&w.d>0;
  case 'oneBand':return !!w&&((w.l>0)!==(w.d>0));
  default:return true;
 }
}
export function questionsFor(state,{optional=false}={}){const model=modelOf(state),cat=categorySelected(state),W=wordsOf(state);
 return (optional?OPTIONAL:CORE).filter(q=>isActive(q,state)).map(q=>{
 let label=q[model+'Label']||q.label,unit=q[model+'Unit']||q.unit;
 if(q.id==='capacity'&&W.cap){label=W.cap;unit=W.capUnit}
 if(q.id==='averageSpendYen'&&W.price)label=W.price;
 const opts=q.id==='businessType'?q.options.filter(o=>!o.hidden&&(!cat||o.category===cat))
  :q.id==='salesModel'&&legacyChoose(state)&&valueOf(state,'businessType')==='cake'?q.options.filter(o=>o.value!=='salon')
  :q.options?q.options.filter(o=>!o.hidden||o.value===valueOf(state,q.id)):q.options;
 return {...q,label,unit,example:q[model+'Example']??q.examples?.[model]??q.example,options:opts};
});}
