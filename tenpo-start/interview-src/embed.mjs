// questions.mjs と state.mjs を、公開画面（1つのHTML）に入れる。
// 使い方：node tenpo-start/interview-src/embed.mjs tenpo-start/plan/index.html
// HTMLの /*IV:BEGIN*/ 〜 /*IV:END*/ の間だけを書き換える。質問の文と分岐は questions.mjs が正。
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const strip=s=>s.replace(/^import .*$/mg,'').replace(/^export (const|function) /mg,'$1 ');
const names=s=>[...s.matchAll(/^export (?:const|function) ([A-Za-z_]\w*)/mg)].map(m=>m[1]);
const q=readFileSync(join(here,'questions.mjs'),'utf8'),st=readFileSync(join(here,'state.mjs'),'utf8');
const block=`/*IV:BEGIN*/\n/* この間は tenpo-start/interview-src から embed.mjs で入れています。ここを直接直さないでください。 */\nconst IV=(()=>{\n${strip(q)}\n${strip(st)}\nreturn {${[...names(q),...names(st)].join(',')}};})();\n/*IV:END*/`;
const target=process.argv[2];if(!target){console.error('HTMLの場所を指定してください');process.exit(1)}
const html=readFileSync(target,'utf8');const re=/\/\*IV:BEGIN\*\/[\s\S]*?\/\*IV:END\*\//;
if(!re.test(html)){console.error('IV:BEGIN / IV:END の印が見つかりません');process.exit(1)}
writeFileSync(target,html.replace(re,()=>block));console.log('入れました：',target);
