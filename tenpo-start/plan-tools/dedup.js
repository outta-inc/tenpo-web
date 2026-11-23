// 1つのHTMLの中の大きいscriptについて、同じ名前で後から定義し直された関数の古い方を消す。
const fs=require('fs'),acorn=require('acorn');
const p=process.argv[2];let h=fs.readFileSync(p,'utf8');
const re=/<script>([\s\S]*?)<\/script>/g;let m,best=null;
while((m=re.exec(h))){if(!best||m[1].length>best.s.length)best={i:m.index+8,s:m[1]}}
const js=best.s;
const ast=acorn.parse(js,{ecmaVersion:'latest',sourceType:'script'});
const decl={};ast.body.forEach(n=>{if(n.type==='FunctionDeclaration'){(decl[n.id.name]=decl[n.id.name]||[]).push(n)}});
const cut=[];for(const[k,v]of Object.entries(decl))if(v.length>1){v.slice(0,-1).forEach(n=>cut.push([n.start,n.end,k]))}
cut.sort((a,b)=>b[0]-a[0]);let out=js;
for(const[a,b,k]of cut){out=out.slice(0,a)+out.slice(b);console.log('removed old',k,b-a)}
h=h.slice(0,best.i)+out+h.slice(best.i+js.length);fs.writeFileSync(p,h);
