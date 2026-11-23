import asyncio,re,json,sys
import os;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from walk2 import walk
from playwright.async_api import async_playwright
BAD=re.compile(r'undefined|NaN|\[object|null万|nullの|Infinity|−0人|-0人')
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':393,'height':852})
    await ctx.route(re.compile(r'fonts\.(googleapis|gstatic)\.com'),lambda r:r.abort())
    pg=await ctx.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(('PAGEERR',cur_ctx[0],str(e)[:200])))
    pg.on('console',lambda m:m.type=='error' and errs.append(('CONSOLE',cur_ctx[0],m.text[:160])))
    cur_ctx=['']
    clicks=[0]
    await pg.goto('http://localhost:8765/plan/');await pg.wait_for_timeout(1500)
    issues={}
    async def check(tag):
      t=await pg.evaluate("document.body.innerText")
      for m in BAD.finditer(t):issues.setdefault(tag+' :: '+t[max(0,m.start()-40):m.start()+30].replace('\n',' '),1)
      ov=await pg.evaluate("[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>395&&getComputedStyle(e).position!=='fixed'}).map(e=>e.tagName+'.'+e.className).slice(0,3)")
      if ov:issues.setdefault(tag+' OVERFLOW '+str(ov),1)
    SEL='[data-tab],[data-hm],[data-tl],[data-x],[data-sv],[data-cb],[data-act],[data-ask],[data-edit],[data-kk],[data-fundpp],[data-x]'
    combos=[('sample',m,None) for m in ['a','d','t','c','b']]+[('ans',None,b) for b in ['カフェ','持ち帰りの店','サロン']]
    idx=int(sys.argv[1]);combos=combos[idx:idx+1]
    for state,mode,biz in combos:
        await pg.evaluate("localStorage.clear()");await pg.reload();await pg.wait_for_timeout(1200)
        if state=='sample':
          await pg.evaluate("smpFill()");await pg.wait_for_timeout(2000)
          await pg.evaluate(f"cur='{mode}';S._cur='{mode}';st();save();render()");await pg.wait_for_timeout(300)
        else:
          await walk(pg,biz);mode=await pg.evaluate("cur")
        pages=[('tab',t) for t in ['home','shop','road','plan','check','files','ask']]+[('area',a) for a in ['concept','place','viable','money','build','menu','team','proc','promo']]
        for kind,v in pages:
          async def goto():
            await pg.evaluate("try{closeSheet()}catch(e){}")
            if kind=='tab':await pg.evaluate(f"st().area=null;st().tab='{v}';render();scrollTo(0,0)")
            else:await pg.evaluate(f"st().tab='home';st().area='{v}';render();scrollTo(0,0)")
            await pg.wait_for_timeout(80)
          cur_ctx[0]=f'{state}/{mode}/{kind}:{v}'
          await goto();await check(cur_ctx[0])
          n=await pg.evaluate(f"document.querySelectorAll('main {SEL}, .wrap {SEL}, body > div:not(#sheet) {SEL}').length")
          descs=await pg.evaluate(f"[...document.querySelectorAll('{SEL}')].filter(e=>!e.closest('#sheet')&&!e.closest('.tabbar')).map(e=>e.outerHTML.slice(0,120))")
          for i,d in enumerate(descs[:30]):
            await goto()
            els=await pg.query_selector_all(SEL)
            els=[e for e in els if await e.evaluate("e=>!e.closest('#sheet')&&!e.closest('.tabbar')")]
            if i>=len(els):break
            el=els[i]
            ask=await el.get_attribute('data-ask')
            if ask: continue  # opens LINE prep only
            cur_ctx[0]=f'{state}/{mode}/{kind}:{v} click#{i} {d[:70]}'
            try:
              await el.scroll_into_view_if_needed(timeout=1000);await el.click(timeout=1500);await pg.wait_for_timeout(150)
            except Exception as e:
              continue
            clicks[0]+=1
            await check(cur_ctx[0])
    print('clicks',clicks[0])
    for k in issues:print('ISSUE',k)
    seen=set()
    for e in errs:
      key=e[2][:120]
      if key in seen:continue
      seen.add(key);print(*e)
    await b.close()
asyncio.run(main())
