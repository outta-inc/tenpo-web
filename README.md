# tenpo-web
TENPO OS の画面の置き場（GitHub Pages）。源は outta-inc/tenpo-os の app/ 以下。ここには公開してよいもの（画面の HTML・公開の鍵）だけを置く。秘密は置かない。

- orion-sample.html — サンプル店舗（洋食オリオン）：店のこと・閉店後の在庫チェック・明日の仕込みと発注

- tenpo-start/plan/ — TENPO/START：ヒアリング → 計画・確かめる・開店まで（Claude 作。1つの HTML。データは利用者の端末の中だけ。相談は公式LINEへ）。公開の番地は https://start.tenpo-os.com （Cloudflare の Worker「tenpo-start」が、ここのファイルを返す。この GitHub の番地で開くと、そちらへ進む）

- tenpo-start/ — 開くと https://start.tenpo-os.com へ進む1枚だけ。旧い「テンポスタート｜開業ノート」の画面（ChatGPT 作の試作）と、その部品・音声入力の試作（voice/）・端末の中で文字を読む部品（listing-ocr/）は、今の TENPO/START が使っていないので 2026/11/25 に外した。要る時は、外す前の版（コミット 15ed477）から戻せる
- tenpo-start/listing-pdf/ — PDF のマイソクを画像にする部品（pdf.js）。tenpo-start/plan/ が使う
- tenpo-start/interview-src/ — ヒアリングの質問の正（questions.mjs・state.mjs）。embed.mjs で plan/index.html に入れる
- tenpo-start/plan-tools/ — plan/index.html の点検の道具
- hacchu-floor.html — 発注アプリの画面（源は outta-inc/tenpo-os の app/hacchu）
