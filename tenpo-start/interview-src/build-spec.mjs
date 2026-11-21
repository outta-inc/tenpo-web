import {writeFileSync} from 'node:fs';
import {CORE,OPTIONAL} from './questions.mjs';
import {createInterview,setAnswer} from './state.mjs';
const now='2026-11-21T09:00:00+09:00';
let example=createInterview('EXAMPLE-CAFE-001',now);
for(const [k,v] of Object.entries({businessType:'cafe',experience:'first',purpose:'近所の人が昼食や午後の休憩に立ち寄る',mainProduct:'コーヒーと温かいサンドイッチ',capacity:12,averageSpendYen:1100,peakStaff:2,propertyStage:'idea',priorities:{mustKeep:'夕方に営業を終えること',canAdjust:'メニュー数と手作りの範囲'},openingTarget:'未定',area:'住宅街。エリアは未定',businessHours:'10時〜17時',daysOffPerWeek:1,operators:'店主1人を基本、昼だけ補助',helperHoursPerDay:3,desiredMonthlyTakeHomeYen:250000})) {
 example=setAnswer(example,k,v==='未定'?null:v,v==='未定'?'undecided':'provisional',now);
}
example=setAnswer(example,'workingHours',null,'undecided',now);
example=setAnswer(example,'ownFundsYen',null,'declined',now);
example.ui.questionId='priorities';
writeFileSync(new URL('./example.json',import.meta.url),JSON.stringify(example,null,2)+'\n');
const branches={chooseModel:'ケーキ屋・菓子店／ほかの業態だけ',notTakeaway:'席で計算する店／サロンだけ',salon:'サロンだけ',helper:'飲食・持ち帰りで混む時間が2人以上の時だけ',experienced:'開業したことがある／今もお店を運営している時だけ'};
function detail(q,i){return `### ${i+1}. ${q.id}\n\n設問：${q.label}\n\n形式：${q.type}。表示：${branches[q.branch]||'共通'}。${q.unit?'単位：'+q.unit+'。':''}\n\n`+
 (q.options?'選択肢（保存する値 → 表示する文）：\n\n'+q.options.map(o=>`- ${o.value} → ${o.label}`).join('\n')+'\n\n':'')+
 (q.example!==undefined?'自由入力の例：'+q.example+'\n\n':'')+
 (q.salonLabel?'サロンでの設問：'+q.salonLabel+'\n\n':'')+
 (q.takeawayLabel?'持ち帰りでの設問：'+q.takeawayLabel+'\n\n':'')+
 (q.salonExample!==undefined?'サロンの入力例：'+q.salonExample+(q.salonUnit||q.unit)+'\n\n':'')+
 (q.examples?'業態別の入力例：'+Object.entries(q.examples).map(([k,v])=>k+'＝'+v).join('／')+'\n\n':'')+
 (q.fields?q.fields.map(f=>'欄：'+f.id+'／'+f.label+'／例：'+f.example).join('\n\n')+'\n\n':'')+
 (q.help?'補足：'+q.help+'\n\n':'')+
 (q.type==='number'?`入力確認：${q.min}以上${q.max!==undefined?'、'+q.max+'以下':''}の${q.integer?'整数':'数値'}。空欄は0に変換しない。\n\n`:'')+
 (q.private?'追加の選択：答えない。拒否理由は聞かない。\n\n':'');}
const spec=`# TENPO/START ヒアリング仕様 v1.0\n\n作成：ChatGPT、2026/11/21。正本7の8項目への返却。実装提案・Claudeへの引継ぎ。公開画面への接続は未実施。\n\n`+
`## 1. 入口と全体の考え方\n\n名前・メール・LINE名は聞かない。最初の文は「まだ決まっていなくても大丈夫です。分かることから、1つずつ残しましょう。」。初回だけ気持ちを受け止める1文を添える。時間を測っていないため「3分でできる」と約束しない。\n\n1画面1つの設問。大切にしたいことと調整できることだけは、同じ1画面に2欄を並べる。カフェ・レストラン・定食屋・居酒屋・バーは9画面、持ち帰りは8画面、サロンは施術時間を加えて10画面。ケーキ屋とほかの業態は売上の形を1画面追加し、答えに応じて9〜11画面。\n\n初めての方と経験者は同じ順番。経験を物件探しの進み具合から推定しない。経験者には追加の質問で「今の店で確かめたこと」を出す。既存店の数字を新店の確定値にしない。\n\n## 2. 最初の設問の文・順番・選択肢\n\n選択肢は単一選択。選び直すと置き換える。同じ選択肢を再び押しても解除しない。数値は自由入力、例はプレースホルダーであり初期値にしない。金額の内部単位は円。\n\n`+
CORE.map(detail).join('')+
`## 3. 追加で聞くこと\n\n基本の回答を確認したあとに「この内容を残す」「分かることをもう少し書く」を表示。後者を選んだ時だけ次を1画面ずつ出す。追加をしなくてもメモを使える。\n\n`+OPTIONAL.map(detail).join('')+
`## 4. 分岐と、答えを直す時\n\nカフェ・レストラン・食堂・定食屋・居酒屋・バーはseated。持ち帰りの店はtakeaway。サロンはsalon。ケーキ屋はseated／takeawayを本人が選ぶ（salonは表示しない）。ほかの業態は3つから選ぶ。カフェでも持ち帰り中心なら「持ち帰りの店」を選ぶことを業態画面の補足に置く。\n\n業態が未定ならモデルはnull。capacityとserviceMinutesは聞かず、汎用の質問だけで保存できる。飲食と物販の混在、複数メニューのサロンの厳密な稼働計算はこの入口で自動推定しない。計算は主力1つの仮の見方として示す。\n\nモデルを変えたら席・ベッド、1人／1会計の金額、施術時間、営業人数・施術人数を再確認する。旧回答はarchivedに残すが、現在の計算には使わない。既存の写真・計画・相談番号を消す「ヒアリングをやり直す」操作に結びつけない。\n\n前の画面へは「戻る」。内容を維持して戻る。業態変更で設問が消えた時だけ進み具合の分母を変え、「お店の形に合わせて質問を変えました」と伝える。ui.questionIdが非表示になったら直前の表示可能な設問に戻す。\n\n## 5. 必須・未定・飛ばす・進み具合\n\nメモを始めるための必須の実値はない。すべて「まだ決めていない」または「今は飛ばす」で進める。両方とも画面では「未定」、内部はundecided／skippedで区別。自分の資金と手元に残したい額には「答えない」を追加しdeclined。答えないを未定の催促に変えない。\n\n数字を出すためにはモデル・客単価／料金・混む時間の人数が必要。seatedには席数、salonには施術台数と施術時間も必要。未定がある時はcalculationInput.ready=false。最初の画面は5項目のメモで、売上や家賃は「条件を確かめると計算できます」と表示する。nullを0や回答例の12席で埋めない。\n\n実値を入れた時は「仮で置く」を初期状態にし、本人が根拠を持つ場合に「確かめた内容」を選べる。経験の有無で自動確定しない。仮の数字にも数値確認は行う。空欄で「次へ」を押した時は「書かずに進む場合は『まだ決めていない』を選べます」と表示する。\n\n進み具合は「お店の質問 3/9」。％の完成度や優劣を出さない。未定・飛ばすでも次の画面に進む。最後は答えと未定を一覧にし、項目ごとに「直す」。基本の最後のボタンは「この内容を残す」。計算が可能な時だけ、そのあとに「計画を見る」を出す。\n\n## 6. 音声・保存・再開\n\nこの版は通常の文字入力を基本とし、端末キーボードの音声入力を使える案内までにする。アプリ独自の録音、音声の自動解釈、会話の自動進行は実装しない。端末やキーボードに音声入力が無い場合も文字と選択肢で全部答えられる。\n\n流れ：自由入力欄を選ぶ → 端末の音声入力を使う → 文字になった内容を見て直す → 自分で「次へ」。音声入力だけで保存確定・送信・次の設問への移動をしない。数字の入力は表示された数と単位を本人が確かめる。コードは録音データを取得・保存・外部送信しない。\n\n1回答ごとに端末へ保存。キーはtenpo-start:interview:v1、既存の計画とは別。読み込み不能・容量不足で保存に失敗したら成功と表示しない。元の内容を残し、コピー用JSONを出す。JSONの読み戻しはschemaVersionと数値・選択肢を確認する。旧版からの移行はClaudeの接続作業で用意する。\n\nブラウザを変える、保存データを消す、端末を変えると自動では引き継げない。「この端末のこのブラウザに保存されます」と案内する。端末保存はアカウント管理や本人確認ではない。\n\n## 7. 保存形式と計算への対応\n\n各answerはvalue／status／source／updatedAt。statusはanswered（確かめた内容）、provisional（仮）、undecided（未定）、skipped（今は飛ばす）、declined（答えない）。未入力と対象外は回答キーを持たない。対象外の履歴はarchived。数値0は自己資金など0が成立する設問でだけ使う。\n\n計算へ渡すキーはmodel、capacity、averageSpendYen、peakStaff、serviceMinutes。全体人数には店主を含む。サロンは同時施術者、台数とは別。takeawayのcapacityはnull、旧版への受け渡しだけ0席にする。サロンのcapacityは台。原価・回転数・営業日数・補助時間・返済額を未回答から生成しない。\n\n5項目のメモへの対応：purpose→来てほしい場面、mainProduct→中心の商品（サロンは中心のメニュー）、workingHoursとbusinessHoursとdaysOffPerWeek→仕事に使える時間、operators→運営する人、priorities.mustKeep/canAdjust→大切にしたいこと／調整できること。営業時間だけがある場合は「営業10時〜17時／準備と片付けは未定」と分ける。peakStaffから雇用関係は作らない。\n\n1人分の保存例は同じフォルダのexample.json。すべて架空。相談番号numberはnull、preparedCountは0、sentCountはnull（送信を観測していない）。LINE表示名は入れない。LINEを開く前の確認画面に、相談番号・店名など実際に文に含める全項目を見せる。LINEを開いただけで「相談した」と記録しない。\n\n`+
'```json\n'+JSON.stringify(example,null,2)+'\n```\n\n'+
`## 8. 言葉づかいと受け渡し\n\n「仮」「未定」「確かめる」「今の店で確かめたこと」「家賃に回せる額」「手元に残したい額」「開けるまでのお金」「続けるためのお金」「今日の1つ」「ここまでの歩み」「頼むときの文」「テンポスタート事務局」を使う。概算、実績値、ToDo、履歴などへ言い換えない。\n\n気持ちの4つの山は、憧れと怖さ／何から手をつけるか分からない／決める怖さ／孤独。受け止める文は場面に合う1行にし、毎画面で繰り返さない。「必ずできる」「融資が通る」「払える」と言い切らない。空欄や戻る行動を失敗扱いしない。相談は手が止まった所に出し、自分で進める道を先に置く。\n\n業態名とモデルは別。初めてかどうかと物件の進み具合は別。本人の答えと、計算のための仮の数は別。旧applyUserへそのまま投入すると区別が消えるため、READMEの接続条件を守る。\n\n今回の元コードはquestions.mjs／state.mjs。画面部品・独自の音声認識は含まない。公開中の画面の置換はClaudeがPRを作り、松尾さんが合流する。元の9問フォームの編集可能なソースは今回確認できていないため、新仕様として版を付けた。\n\n組込みの確認条件：3モデルを最後まで進める／すべて未定でメモへ進める／戻っても答えが残る／業態変更で単位が混ざらない／サロン45分を保存できる／0円と未定を区別する／保存に失敗しても成功表示しない／既存の計画・写真・相談番号が消えない／音声入力後に本人が直せる／LINEを開いただけでは送信済みにしない。\n`;
writeFileSync(new URL('./SPEC.md',import.meta.url),spec);
