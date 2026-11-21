# TENPO/START ヒアリング仕様 v1.0

2026/11/21、ChatGPT作成。質問の文・分岐・保存形式の編集可能な元コードです。旧9問フォームの復元物ではありません。公開画面の差し替えはClaudeの担当です。

## ファイル

- `questions.mjs`：全設問、全選択肢、例、表示順、業態別の分岐。
- `state.mjs`：回答状態、入力確認、保存と再開、計算への受け渡し。
- `state.test.mjs`：未定、業態変更、円単位、サロンの施術時間、保存失敗などの確認。
- `SPEC.md`：実装用の全仕様。文書とコードを一緒に変更してください。
- `example.json`：架空の12席カフェの保存例。本人のデータに自動適用しません。

## 確認方法

Node.jsで `node --test tenpo-start/interview-src/state.test.mjs`。
外部パッケージとビルドは不要です。ブラウザではES modulesとして読み込めます。

## 公開画面に入れる時

既存 `tenpo-start/plan/index.html` は今回変更していません。新しいUIは未接続です。

`questionsFor` でその時点の設問を出し、`setAnswer` の返り値を保持します。数値の空欄を0に変換せず、「まだ決めていない」でnullを保存してください。文字列から数値に直すのは入力確認のあとだけです。

`saveInterview` が失敗した時は成功表示を出さず、返された文を表示します。`loadInterview` のエラー時は既存データを消さず、JSONの書き出し・復旧の導線を用意します。`ui.questionId` を保存して再開します。

`calculationInput` がready=falseなら、5項目のメモを表示し、足りない計算条件を「未定」として残します。既存 `applyUser` へ渡すと例の数字が混ざるため、そのまま呼ばないでください。

`legacyPayload` は項目対応の参考です。**そのまま既存applyUserに投入する互換APIではありません。** 既存のoffは文字列、こちらは数値です。ownYen/keepYenは円で、新しい仕様のstatus/sourceを既存ans/tmpに対応させる改修も必要です。bizは既存3モデルの判別用。表示名はbusinessLabelを使い、別業態をカフェと表示しないでください。

営業日数26日、回転数3、原価率などはここでは生成しません。計算側で仮として置く場合は、答えとは別に保存し、根拠と変更方法を見せます。「仮で置く」で本人が書いた値も確定とは扱いません。

既存の計画・写真・相談番号を保持したまま移行する処理、画面と音声の実機確認はClaudeの組込み時に実施します。新しい保存キーは `tenpo-start:interview:v1`。既存 `tenpo-start:plan:v1` を削除しません。

LINEの名前は取得しません。相談番号は認証IDではありません。LINEを開いただけで送信済みと記録せず、preparedCountと送信確認を分けます。

## 公開画面への接続（2026/11/21、Claude）

`tenpo-start/plan/index.html` に接続しました。質問の文・順番・分岐・保存形式は、この `questions.mjs` と `state.mjs` が正です。

- 入れ方：`node tenpo-start/interview-src/embed.mjs tenpo-start/plan/index.html`。HTMLの `/*IV:BEGIN*/`〜`/*IV:END*/` の間だけを書き換えます。質問を変えた時は、テストのあとにこれを実行してください。
- 画面：1画面1設問。「次へ」「戻る」「まだ決めていない」「今は飛ばす」「答えない」。一覧で「直す」、最後は「この内容を残す」。計算できる時だけ「計画を見る」。
- 計算へ：`calculationInput` がreadyの時だけ計画を出します。足りない時は5項目のメモと、足りない答えの一覧だけを出し、数字は出しません。
- 状態の対応：provisional →「ヒアリングの答え」、answered →「あなたの入力」。回転数・営業日数・原価率などは答えから作らず、「仮置き」として根拠を添えて別に置きます。
- 以前の入力フォームで作った計画（`tenpo-start:plan:v1`）はそのまま開けます。答えは初回に `tenpo-start:interview:v1` へ写します。計画・写真・相談番号・歩みは消しません。
- 読み込めない保存は `tenpo-start:interview:v1:backup` に写し、画面からコピーできます。
- 相談：LINEを開く前に、文に入れる全項目を見せます。記録は「相談の文を用意した」。送信は記録しません。
