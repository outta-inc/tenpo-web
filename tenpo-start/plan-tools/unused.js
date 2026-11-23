const fs=require('fs'),acorn=require('acorn');
const p=process.argv[2],doCut=process.argv[3]==='cut';let h=fs.readFileSync(p,'utf8');
const re=/<script>([\s\S]*?)<\/script>/g;let m,best=null;
while((m=re.exec(h))){if(!best||m[1].length>best.s.length)best={i:m.index+8,s:m[1]}}
const js=best.s,ast=acorn.parse(js,{ecmaVersion:'latest'});
const res=[];
for(const n of ast.body){let name=null;if(n.type==='FunctionDeclaration')name=n.id.name;else if(n.type==='VariableDeclaration'&&n.declarations.length===1&&n.declarations[0].id.type==='Identifier')name=n.declarations[0].id.name;if(!name)continue;
 const rest=h.slice(0,best.i+n.start)+h.slice(best.i+n.end);const c=(rest.match(new RegExp('(^|[^\\w$.])'+name.replace('$','\\$')+'(?![\\w$])','g'))||[]).length;if(c===0)res.push([n.start,n.end,name])}
res.forEach(r=>console.log('unused',r[2],r[1]-r[0]));
if(doCut){let out=js;res.sort((a,b)=>b[0]-a[0]).forEach(([a,b])=>{out=out.slice(0,a)+out.slice(b)});h=h.slice(0,best.i)+out+h.slice(best.i+js.length);fs.writeFileSync(p,h)}
