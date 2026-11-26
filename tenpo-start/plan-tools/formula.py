# 試算の式と合計がそろうかの点検（2026/11/25）
# 使い方：tenpo-start/ で python3 -m http.server 8765 を動かしてから、python3 formula.py [幅 ...]（既定は 393。PCの幅も見る時は 393 1280）
# 確かめること：
#  1. 最初の試算の画面で、出している式（金額 × 人数 × 日数）を掛けて足すと、出している月の売上と同じになる（38通りの業態・曜日）
#  2. ＋／−を押すたびに、同じく合う
#  3. 計画のページ（お金の流れ・計算の中身）と、公庫に出す下書きの式も、月の売上と合う
#  4. 数字を直すシートを開いて、直さずに「この数字にする」を押しても、数は変わらない。読み込み直しても変わらない
#  5. 時間帯・店内以外の売り方を足した時、自分で回転数や埋まり具合を打った時、前からの利用者（回転数1.2・埋まり具合60%のまま）、答えの席数を直した時
#  6. どの画面にも、丸めていない小数（1.1666…）・NaN・undefined が出ない
# 何も「NG」が出なければ合格。
import asyncio, re, sys
from playwright.async_api import async_playwright
URL='http://localhost:8765/plan/'
WK={'weekdayBoth':[[1,1]]*5+[[0,0]]*2,'nightly':[[0,1]]*7,'weekdayLunch':[[1,0]]*5+[[0,0]]*2,'allBoth':[[1,1]]*6+[[0,0]]}
CASES=[
 # 名前, 大項目, 中項目, 曜日の型, 金額, 昼の金額, 席・台, 料金の形
 ('カフェ12席 昼夜','food','cafe','weekdayBoth',2000,1200,12,None),
 ('カフェ12席 昼だけ','food','cafe','weekdayLunch',1200,None,12,None),
 ('カフェ9席 昼だけ1600円','food','cafe','weekdayLunch',1600,None,9,None),
 ('居酒屋20席 夜だけ','food','izakaya','nightly',3500,None,20,None),
 ('ビストロ14席 夜だけ6000円','food','bistro','nightly',6000,None,14,None),
 ('バー7席 夜だけ','food','bar','nightly',3000,None,7,None),
 ('食堂3席 昼夜','food','restaurant','allBoth',2500,1200,3,None),
 ('ラーメン8席 昼夜','food','noodle','allBoth',1200,1000,8,None),
 ('弁当','takeaway','bento','weekdayLunch',800,None,None,None),
 ('パン・ケーキ','takeaway','cake','allBoth',1500,None,None,None),
 ('スタンド','takeaway','stand','weekdayLunch',600,None,None,None),
 ('物販','takeaway','retail','allBoth',2500,None,None,None),
 ('美容室2台','beauty','hair','allBoth',6000,None,2,None),
 ('ネイル1台','beauty','nail','weekdayBoth',6000,None,1,None),
 ('エステ2台','beauty','esthe','weekdayBoth',8000,None,2,None),
 ('もみほぐし3台','beauty','relax','allBoth',6000,None,3,None),
 ('整体1台','beauty','seitai','weekdayBoth',6000,None,1,None),
 ('整骨院3台','beauty','seikotsu','allBoth',2500,None,3,None),
 ('鍼灸院2台','beauty','shinkyu','weekdayBoth',5000,None,2,None),
 ('学習塾8人 1回ごと','school','juku','nightly',3000,None,8,'visit'),
 ('料理教室6人 1回ごと','school','cooking','weekdayLunch',4000,None,6,'visit'),
 ('ヨガ10人 1回ごと','school','yoga','weekdayBoth',2500,None,10,'visit'),
 ('ジム1人 1回ごと','school','gym','weekdayBoth',7000,None,1,'visit'),
 ('ヨガ10人 会員制','school','yoga','weekdayBoth',9000,None,10,'monthly'),
 ('ジム1人 会員制','school','gym','weekdayBoth',30000,None,1,'monthly'),
 ('レンタルスペース1室','space','rental','allBoth',4000,None,1,None),
 ('撮影スタジオ1室','space','studio','allBoth',10000,None,1,None),
 ('ギャラリー1室','space','gallery','allBoth',20000,None,1,None),
 ('ペットサロン2件','life','petsalon','weekdayBoth',7000,None,2,None),
 ('ペットホテル6件','life','pethotel','allBoth',5000,None,6,None),
 ('カフェ12席 曜日は未定','food','cafe',None,1200,None,12,None),
 ('ビストロ11席 曜日は未定','food','bistro',None,6000,None,11,None),
 ('食堂7席 曜日も金額も未定','food','restaurant',None,None,None,7,None),
 ('美容室2台 曜日は未定','beauty','hair',None,6000,None,2,None),
 ('弁当 曜日は未定','takeaway','bento',None,800,None,None,None),
 ('カフェ14席 今お店をしている','food','cafe','weekdayBoth',2000,1200,14,None,{'experience':'operating','existingGuestsPerDay':40,'existingSeats':12,'existingDaysPerMonth':26,'existingCostRatePct':30}),
 ('弁当 今お店をしている','takeaway','bento','weekdayLunch',800,None,None,None,{'experience':'operating','existingGuestsPerDay':55,'existingDaysPerMonth':24,'existingCostRatePct':38}),
 ('整体3台 今お店をしている','beauty','seitai','weekdayBoth',6000,None,3,None,{'experience':'operating','existingGuestsPerDay':7,'existingSeats':2,'existingDaysPerMonth':24,'existingCostRatePct':8}),
]
SETUP="""(A)=>{IVS=IV.createInterview('IV-T',ivNow());
 for(let n=0;n<4;n++)for(const q of IV.questionsFor(IVS)){if(IVS.answers[q.id]||A[q.id]==null)continue;try{IVS=IV.setAnswer(IVS,q.id,A[q.id],'provisional',ivNow())}catch(e){console.log('setAnswer',q.id,String(e))}}
 for(const q of IV.questionsFor(IVS)){if(!IVS.answers[q.id])try{IVS=IV.setAnswer(IVS,q.id,null,'undecided',ivNow())}catch(e){}}
 ivFirstDone();return{cur,mode:ivMode()}}"""
def num(t): return float(t.replace(',',''))
def line_sum(row):
    # 「月の売上」の行から、式の合計と、出している合計を取り出す。約が付いた行は確かめない（None）
    m=re.match(r'月の売上\s*(.*)\s([\d,]+)円$',row)
    if not m: return None,None,None
    body,total=m.group(1),num(m.group(2))
    parts=re.split(r'(?<=[日回人])(?:あなたの答え|仮)?\s*(?=(?:[昼夜]：|持ち帰り：|デリバリー：|月額|[\d,]+円))',body)
    tot=0;approx=False;used=[]
    for p in parts:
        p=p.strip()
        if not p: continue
        if '約' in p: approx=True
        ns=[num(x) for x in re.findall(r'(\d[\d,]*(?:\.\d+)?)(?=円|人|件|日|回)',p)]
        if len(ns)<2: continue
        v=1
        for x in ns: v*=x
        tot+=v;used.append((p,ns))
    return tot,total,approx
async def setup(pg,c):
    name,cat,biz,wk,price,price2,cap,fee=c[:8];extra=c[8] if len(c)>8 else {}
    await pg.goto(URL);await pg.evaluate("localStorage.clear()");await pg.reload();await pg.wait_for_timeout(500)
    A={'experience':'first','category':cat,'businessType':biz}
    if wk: A['schedule']=WK[wk]
    if price: A['averageSpendYen']=price
    if price2: A['secondSpendYen']=price2
    if cap: A['capacity']=cap
    if fee: A['feeModel']=fee
    A.update(extra)
    return await pg.evaluate(SETUP,A)
RAW=re.compile(r'\d+\.\d{3,}')
BADW=re.compile(r'NaN|undefined|Infinity|\[object')
JS_LINES="""()=>{const r=calc(),L=salesLines(r);return{cur,sales:r.sales,sum:L.reduce((a,l)=>a+l.sales,0),man:man(r.sales),
 L:L.map(l=>({k:l.k,n:l.n,sales:l.sales,t1:slTxt(l,'×'),t2:slTxt(l),t3:slTxt(cur==='c'&&l.k==='main'&&l.days!=null?{...l,unit:'人'}:l,' × ',1)})),text:document.body.innerText,
 sheet:(document.getElementById('sheet')||{}).innerText||''}}"""
def prod(txt):
    # 「（12席 × 1.17回転）」の添え書きは掛けない
    t=re.sub(r'（[^）]*）','',txt)
    ns=[num(x) for x in re.findall(r'(\d[\d,]*(?:\.\d+)?)(?=円|人|件|日|回)',t)]
    v=1
    for x in ns: v*=x
    return v
class T:
    def __init__(s): s.ng=[];s.n=0
    def ok(s,cond,msg):
        s.n+=1
        if not cond: s.ng.append(msg);print('   NG',msg)
async def first_ok(pg,t,name,tag):
    summary=pg.locator('#first-breakdown:not([open]) > summary')
    if await summary.count(): await summary.click()
    d=await pg.evaluate("()=>({rows:[...document.querySelectorAll('.fr')].map(e=>e.innerText.replace(/\\s+/g,' ').trim()),text:document.body.innerText,steps:[...document.querySelectorAll('.fstep')].map(e=>e.innerText.replace(/\\s+/g,' ').trim())})")
    row=next((x for x in d['rows'] if x.startswith('月の売上')),'')
    tot,total,approx=line_sum(row)
    t.ok(tot is not None and not approx and abs(tot-total)<0.5,f'{name} [{tag}] 最初の画面：式 {tot} ≠ 合計 {total}｜{row}')
    t.ok(not RAW.search(d['text']),f'{name} [{tag}] 最初の画面に生の小数：{RAW.findall(d["text"])[:3]}')
    t.ok(not BADW.search(d['text']),f'{name} [{tag}] 最初の画面に NaN など')
    return d
async def plan_ok(pg,t,name,tag,expect_exact=True):
    await pg.evaluate("()=>{S._iv=null;const s=st();s.tab='plan';s.area=null;s.fo=1;render()}")
    d=await pg.evaluate(JS_LINES)
    t.ok(abs(d['sum']-d['sales'])<0.5,f'{name} [{tag}] 行の合計 {d["sum"]} ≠ 月の売上 {d["sales"]}')
    body=d['text'].replace(' ',' ')
    for l in d['L']:
        if len(d['L'])<=2: t.ok(l['t1'] in body,f'{name} [{tag}] お金の流れに式が無い：{l["t1"]}')
        t.ok(l['t2'] in body,f'{name} [{tag}] 計算の中身に式が無い：{l["t2"]}')
        if '約' not in l['t2']:
            t.ok(abs(prod(l['t2'])-l['sales'])<0.5,f'{name} [{tag}] 式を掛けた数 {prod(l["t2"])} ≠ その行の売上 {l["sales"]}｜{l["t2"]}')
            t.ok(abs(prod(l['t3'])-l['sales'])<0.5,f'{name} [{tag}] 公庫の式 {prod(l["t3"])} ≠ {l["sales"]}｜{l["t3"]}')
        elif expect_exact: t.ok(False,f'{name} [{tag}] 「約」が付いた：{l["t2"]}')
    t.ok(d['man'] in body,f'{name} [{tag}] 売上 {d["man"]} が画面に無い')
    t.ok(not RAW.search(body),f'{name} [{tag}] 計画のページに生の小数：{RAW.findall(body)[:3]}')
    t.ok(not BADW.search(body),f'{name} [{tag}] 計画のページに NaN など')
    return d
async def run(width):
    t=T()
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':width,'height':852})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
        for c in CASES:
            name=c[0];st=await setup(pg,c);cur=st['cur']
            await first_ok(pg,t,name,'最初')
            # ＋／−
            seq=[('main',1),('main',1),('main',1),('main',-1),('b2',1),('b2',1),('b2',-1),('main',-1),('main',-1),('main',-1),('main',1)]
            for k,dv in seq:
                if k=='b2' and not await pg.evaluate("!!st().band2&&(cur==='a'||cur==='d')"): continue
                await pg.click(f'[data-fst="{k}:{dv}"]');await pg.wait_for_timeout(30)
                await first_ok(pg,t,name,f'{k}{dv:+d}')
            # ホームへ → 計画のページ
            await pg.click('[data-fgo="home"]');await pg.wait_for_timeout(60)
            home=await pg.evaluate("document.body.innerText")
            t.ok(not RAW.search(home),f'{name} ホームに生の小数：{RAW.findall(home)[:3]}');t.ok(not BADW.search(home),f'{name} ホームに NaN など')
            await plan_ok(pg,t,name,'計画')
            # 公庫の下書き
            kb=await pg.evaluate("()=>{const b=brief('kouko').find(x=>x[0]==='売上の根拠');return b?b[1]:null}")
            d=await pg.evaluate(JS_LINES)
            t.ok(kb==' ＋ '.join(l['t3'] for l in d['L']),f'{name} 公庫の下書きの式が違う：{kb}')
            # 計算のもと：数字を直すシートを開いて、直さずに「この数字にする」→ 数は変わらない
            for k in (['turns'] if cur=='a' else ['util'] if (cur=='c' and not await pg.evaluate("memOn()")) else ['peak','off'] if cur=='t' else []):
                v0=await pg.evaluate(f"st().f.{k}.v")
                await pg.evaluate(f"numSheet('{k}')");await pg.wait_for_timeout(40)
                shown=await pg.evaluate("document.getElementById('ns_v').value")
                t.ok(not RAW.search(shown),f'{name} {k} の入力欄に生の小数：{shown}')
                sh=await pg.evaluate("document.getElementById('sheet').innerText");t.ok(not RAW.search(sh),f'{name} {k} のシートに生の小数：{RAW.findall(sh)[:3]}')
                await pg.click('#ns_ok');await pg.wait_for_timeout(40)
                v1=await pg.evaluate(f"st().f.{k}.v")
                t.ok(v0==v1,f'{name} {k}：直していないのに {v0} → {v1}')
                await pg.evaluate("closeSheet()")
            cb=await pg.evaluate("()=>{cbSheet();const x=document.getElementById('sheet').innerText;closeSheet();return x}")
            t.ok(not RAW.search(cb),f'{name} 計算のもとに生の小数：{RAW.findall(cb)[:3]}');t.ok(not BADW.search(cb),f'{name} 計算のもとに NaN など')
            await plan_ok(pg,t,name,'計算のもとの後')
            # 読み込み直しても同じ
            s0=await pg.evaluate("calc().sales");await pg.reload();await pg.wait_for_timeout(400)
            s1=await pg.evaluate("calc().sales");t.ok(abs(s0-s1)<1e-6,f'{name} 読み込み直すと売上が変わる {s0} → {s1}')
            await plan_ok(pg,t,name,'読み込み直し')
            # 時間帯・店内以外の売り方を足す（席のお店・持ち帰り）
            if cur in('a','t'):
                if not await pg.evaluate("!!st().band2"): await pg.evaluate("b2Add()")
                await pg.evaluate("()=>{if(offOk()){OFF_CH().forEach(c=>{offAdd(c);const x=st().off[c];x.orders=c==='tk'?7:5;x.fee=c==='dv'?35:0});save();render()}}")
                await plan_ok(pg,t,name,'時間帯と店内以外を足した')
                await pg.evaluate("()=>{S._iv={mode:'first'};render()}");await first_ok(pg,t,name,'足した後の最初の画面')
                for k,dv in [('main',1),('main',-1)]:
                    await pg.click(f'[data-fst="{k}:{dv}"]');await pg.wait_for_timeout(30);await first_ok(pg,t,name,f'足した後 {k}{dv:+d}')
            # 自分で回転数・埋まり具合を打った時（小数1桁）→ 小数1桁の人数で、式は合う。割り切れない時は「約」
            if cur=='a':
                await pg.evaluate("()=>{applyEdit('turns',1.3,'you',1);save();render()}");d=await plan_ok(pg,t,name,'回転数を1.3と打った',expect_exact=False)
            if cur=='c' and not await pg.evaluate("memOn()"):
                await pg.evaluate("()=>{applyEdit('util',45,'you',1);save();render()}");await plan_ok(pg,t,name,'埋まり具合を45%と打った',expect_exact=False)
        # 前からの利用者：回転数1.2（仮）・埋まり具合60%（仮）のまま保存されている
        for c in [CASES[0],CASES[12],CASES[29]]:
            name=c[0]+'（前からの利用者）';await setup(pg,c);await pg.click('[data-fgo="home"]')
            await pg.evaluate("()=>{const s=st();if(cur==='a'){s.f.turns={v:1.2,src:'tmp'};s.band2.turns=0.8}if(cur==='c')s.f.util={v:60,src:'tmp'};save()}")
            await pg.reload();await pg.wait_for_timeout(400)
            v=await pg.evaluate("cur==='a'?st().f.turns.v:st().f.util.v");t.ok(v in(1.2,60),f'{name} 保存した数が変わった：{v}')
            d=await plan_ok(pg,t,name,'計画',expect_exact=False)
            t.ok(all('約' not in l['t2'] for l in d['L']),f'{name} 小数1桁で出るはず：{[l["t2"] for l in d["L"]]}')
            print('   前からの利用者',[l['t2'] for l in d['L']],d['man'])
        # 答えを直す：席数を変えると、仮の人数は置き直されて、ちょうどの数になる
        for c,cap in [(CASES[0],10),(CASES[2],11),(CASES[12],3),(CASES[16],2)]:
            name=c[0]+f'（席・台を{cap}に直す）';await setup(pg,c);await pg.click('[data-fgo="home"]')
            await pg.evaluate("(cap)=>{IVS=IV.setAnswer(IVS,'capacity',cap,'provisional',ivNow());ivFinish()}",cap);await pg.wait_for_timeout(60)
            d=await plan_ok(pg,t,name,'計画');print('   答えを直す',name,[l['t2'] for l in d['L']],d['man'])
        print('errors:',errs[:5]);t.ok(not errs,f'画面のエラー：{errs[:3]}')
        await b.close()
    print(f'幅{width}：確かめた数 {t.n}／合わない {len(t.ng)}');return len(t.ng)
if __name__=='__main__':
    w=[int(x) for x in sys.argv[1:]] or [393]
    bad=0
    for x in w: bad+=asyncio.run(run(x))
    sys.exit(1 if bad else 0)
