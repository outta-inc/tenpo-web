import asyncio,re,json
from playwright.async_api import async_playwright
KW=['回せる','参考額','上限','手元に残したい']
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={'width':393,'height':852})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('http://localhost:8765/plan/');await pg.wait_for_timeout(1500)
    await pg.evaluate("smpFill()");await pg.wait_for_timeout(2500)
    hits={}
    async def grab(tag):
      t=await pg.evaluate("document.body.innerText+' '+[...document.querySelectorAll('details')].map(d=>d.textContent).join(' ')")
      for k in KW:
        for m in re.finditer(k,t):
          sn=t[max(0,m.start()-40):m.start()+25].replace('\n',' ')
          hits.setdefault(tag+' :: '+sn,1)
    for mode in ['a','d','t','c']:
      await pg.evaluate(f"cur='{mode}';st();save();render()");await pg.wait_for_timeout(300)
      for tab in ['home','shop','road','plan','check','files','ask']:
        await pg.evaluate(f"closeSheet&&closeSheet();st().area=null;st().tab='{tab}';render()");await pg.wait_for_timeout(150);await grab(f'{mode}/{tab}')
      for a in ['concept','place','viable','money','build','menu','team','proc','promo']:
        await pg.evaluate(f"st().tab='home';st().area='{a}';render()");await pg.wait_for_timeout(120);await grab(f'{mode}/area:{a}')
      for sh in ['ppSheet()','moneySheet()','rentSheet()','cbSheet()','guideSheet()',"svSheet('kouko')","svSheet('naiso')"]:
        try:
          await pg.evaluate(sh);await pg.wait_for_timeout(150);await grab(f'{mode}/{sh}')
        except Exception as e: hits[f'{mode}/{sh} ERR {e}'[:120]]=1
      for k in await pg.evaluate("Object.keys(P[cur].fields)"):
        try:
          await pg.evaluate(f"editSheet('{k}')");await pg.wait_for_timeout(60);await grab(f'{mode}/edit:{k}')
        except Exception: pass
    for h in hits:print(h)
    print('errs',errs[:5]);await b.close()
asyncio.run(main())
