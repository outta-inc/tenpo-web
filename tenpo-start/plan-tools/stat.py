# 進み具合を数える所の点検（2026/11/25）
# 使い方：tenpo-start/ で python3 -m http.server 8765 を動かしてから、python3 stat.py
# 確かめること：端末ごとに1回だけ送る／送るのは「出来事・初めて開いた週の月曜・業態の大項目」の3つだけ／届かなかった時は次に開いた時にもう1度だけ／
#               手元と試験・?nostat=1・「追跡しない」では送らない／アプリの中に説明がある
# 送り先（TENPO/OS の api.start_stat_put）は、この点検の中で受け止める。本番には届かない
import asyncio, json, sys, datetime
from playwright.async_api import async_playwright
URL='http://localhost:8765/plan/'
WK=[[1,1]]*5+[[0,0]]*2
DONE="""(A)=>{IVS=IV.createInterview('IV-T',ivNow());for(let n=0;n<4;n++)for(const q of IV.questionsFor(IVS)){if(IVS.answers[q.id]||A[q.id]==null)continue;try{IVS=IV.setAnswer(IVS,q.id,A[q.id],'provisional',ivNow())}catch(e){}}ivFirstDone()}"""
def monday_jst(ms=None):
    t=datetime.datetime.fromtimestamp(ms/1000,datetime.timezone.utc) if ms else datetime.datetime.now(datetime.timezone.utc)
    j=t+datetime.timedelta(hours=9);return (j-datetime.timedelta(days=j.weekday())).strftime('%Y-%m-%d')
async def main():
    res=[]
    def ok(n,v): res.append(bool(v)); print(('ok ' if v else 'NG ')+n)
    async with async_playwright() as p:
        b=await p.chromium.launch()
        async def ctx(flag=True,reply=None,dnt=False,drop=0):
            c=await b.new_context(viewport={'width':393,'height':852}); calls=[]
            async def h(route):
                calls.append(json.loads(route.request.post_data or '{}')|{'_h':route.request.headers})
                if len(calls)<=drop: return await route.abort()   # 通信そのものが通らなかった時
                await route.fulfill(status=200,content_type='application/json',body=json.dumps(reply if reply is not None else {'ok':True}))
            await c.route('**/rest/v1/rpc/start_stat_put',h)
            if flag: await c.add_init_script("window.__startStatTest=true")
            if dnt: await c.add_init_script("Object.defineProperty(navigator,'doNotTrack',{get:()=>'1'})")
            pg=await c.new_page(); return c,pg,calls
        ev=lambda calls:[x['p_event'] for x in calls]
        # 1 初めて開く → open を1回。読み込み直しても送らない
        c,pg,calls=await ctx(); await pg.goto(URL); await pg.wait_for_timeout(900)
        ok('T-01 初めて開くと「初めて開いた」を1回送る', ev(calls)==['open'])
        ok('T-02 送るのは3つだけ（出来事・初めて開いた週の月曜・業態の大項目）。入れた内容・番号は送らない', set(calls[0].keys())-{'_h'}=={'p_event','p_cohort','p_cat'} and calls[0]['p_cohort']==monday_jst() and calls[0]['p_cat']=='' and 'authorization' not in calls[0]['_h'])
        await pg.reload(); await pg.wait_for_timeout(700); ok('T-03 読み込み直しても、もう1度は送らない', ev(calls)==['open'])
        # 2 5問を終える → iv_done（業態の大項目つき）。画面を何度描いても1回
        await pg.evaluate(DONE,{'experience':'first','category':'food','businessType':'cafe','schedule':WK,'averageSpendYen':2000,'secondSpendYen':1200,'capacity':12}); await pg.wait_for_timeout(600)
        for _ in range(3): await pg.click('[data-fst="main:1"]'); await pg.wait_for_timeout(60)
        ok('T-04 5問を終えると「5問を終えた」を1回送る（業態の大項目つき）', ev(calls)==['open','iv_done'] and calls[1]['p_cat']=='food')
        # 3 家賃を入れる → place
        await pg.evaluate("()=>{S._iv=null;st().rentSeen=150000;save();render()}"); await pg.wait_for_timeout(500)
        ok('T-05 物件か家賃を入れると「物件か家賃を入れた」を1回送る', ev(calls)==['open','iv_done','place'])
        # 4 登録・相談（端末の中の印で見る）
        await pg.evaluate("()=>{S._acc=1;st().asks=[{t:'x',day:0}];save()}"); await pg.wait_for_timeout(500)
        ok('T-06 登録した・相談の文を用意した を1回ずつ送る', sorted(ev(calls))==sorted(['open','iv_done','place','signup','consult']))
        # 5 7日以上あとに開く → back7。初めて開いた週は、最初の日のまま
        t0=await pg.evaluate("()=>{const z=JSON.parse(localStorage.getItem('tenpo-start:stat:v1'));z.t0=Date.now()-8*864e5;localStorage.setItem('tenpo-start:stat:v1',JSON.stringify(z));return z.t0}")
        await pg.reload(); await pg.wait_for_timeout(800)
        ok('T-07 7日以上あとに開くと「もう1度開いた」を1回送る（週は、初めて開いた日の週）', ev(calls).count('back7')==1 and calls[-1]['p_cohort']==monday_jst(t0) and len(calls)==6)
        await pg.reload(); await pg.wait_for_timeout(600); ok('T-08 全部送った後は、何も送らない', len(calls)==6)
        st=await pg.evaluate("localStorage.getItem('tenpo-start:stat:v1')"); ok('T-09 端末に覚えるのは、初めて開いた時刻と、送った印だけ', set(json.loads(st).keys())=={'t0','sent'} and set(json.loads(st)['sent'].keys())=={'open','iv_done','place','signup','consult','back7'})
        await c.close()
        # 6 届かなかった時（断られた時）：その回は1度だけ試し、次に開いた時にもう1度
        c,pg,calls=await ctx(reply={'ok':False}); await pg.goto(URL); await pg.wait_for_timeout(700)
        for _ in range(4): await pg.evaluate("save()")
        await pg.wait_for_timeout(300); n1=len(calls); await pg.reload(); await pg.wait_for_timeout(700)
        ok('T-10 断られた時は、1回の表示につき1度だけ試す。次に開いた時に、もう1度', n1==1 and len(calls)==2 and ev(calls)==['open','open'])
        ok('T-15 届かなかったことは、数として残る（握りつぶさない）。送った印は付かない', await pg.evaluate('STAT.fail')==1 and 'open' not in json.loads(await pg.evaluate("localStorage.getItem('tenpo-start:stat:v1')")).get('sent',{}))
        await c.close()
        # 6b 通信そのものが通らなかった時：その場でもう1度だけ試す。届けば、送った印が付く
        c,pg,calls=await ctx(drop=1); await pg.goto(URL); await pg.wait_for_timeout(900); n1=len(calls)
        s1=json.loads(await pg.evaluate("localStorage.getItem('tenpo-start:stat:v1')")).get('sent',{}); await pg.reload(); await pg.wait_for_timeout(700)
        ok('T-16 通信が通らなかった時は、その場でもう1度だけ試す。届けば、次からは送らない', n1==2 and ev(calls)==['open','open'] and s1.get('open')==1 and len(calls)==2)
        await c.close()
        c,pg,calls=await ctx(drop=9); await pg.goto(URL); await pg.wait_for_timeout(900)
        ok('T-17 2度とも通らなければ、そこでやめる（アプリは動き続ける・届かなかった数は残る）', len(calls)==2 and await pg.evaluate('STAT.fail')==1 and await pg.evaluate("!!document.querySelector('#app, main, body').innerText.length"))
        await c.close()
        # 7 送らない時
        c,pg,calls=await ctx(flag=False); await pg.goto(URL); await pg.wait_for_timeout(700); ok('T-11 手元・試験（localhost・自動操作）では送らない', len(calls)==0); await c.close()
        c,pg,calls=await ctx(); await pg.goto(URL+'?nostat=1'); await pg.wait_for_timeout(700); ok('T-12 番地に ?nostat=1 がある時は送らない', len(calls)==0); await c.close()
        c,pg,calls=await ctx(dnt=True); await pg.goto(URL); await pg.wait_for_timeout(700); ok('T-13 ブラウザで「追跡しない」にしている時は送らない', len(calls)==0); await c.close()
        # 8 アプリの中の説明
        c,pg,calls=await ctx(flag=False); await pg.goto(URL); await pg.wait_for_timeout(500)
        await pg.evaluate(DONE,{'experience':'first','category':'food','businessType':'cafe','schedule':WK,'averageSpendYen':2000,'capacity':12}); await pg.click('[data-fgo="home"]'); await pg.wait_for_timeout(200)
        await pg.evaluate("document.querySelector('[data-tl=\"guide:\"]')?document.querySelector('[data-tl=\"guide:\"]').click():toolSheet&&0"); await pg.wait_for_timeout(300)
        t=await pg.evaluate("document.getElementById('sheet').innerText"); 
        if '知っておいてほしいこと' not in t:
            await pg.evaluate("()=>{const b=[...document.querySelectorAll('button')].find(x=>/できること/.test(x.innerText));if(b)b.click()}"); await pg.wait_for_timeout(300); t=await pg.evaluate("document.getElementById('sheet').innerText")
        ok('T-14 アプリの中に説明がある（数だけを数える・だれの端末かは記録しない・入れた内容は送らない）', '数だけを数えています' in t and 'だれの端末かは記録しません' in t and '入れた内容も送りません' in t)
        await b.close()
    print('pass %d fail %d'%(sum(res),len(res)-sum(res))); return 0 if all(res) else 1
if __name__=='__main__': sys.exit(asyncio.run(main()))
