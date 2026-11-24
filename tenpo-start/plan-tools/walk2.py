import asyncio
from playwright.async_api import async_playwright
SKIP={'次へ','今は飛ばす','まだ決めていない','戻る','この内容を残す','分かることをもう少し書く','計画を見る','試算を見る','この試算で、お店の画面へ進む','答えを直す'}
CAT={'カフェ':('飲食店','カフェ・喫茶'),'居酒屋':('飲食店','居酒屋'),'持ち帰りの店':('持ち帰り・物販','弁当・惣菜'),'パン・ケーキ':('持ち帰り・物販','パン・ケーキ・菓子'),'サロン':('美容・施術','リラクゼーション・整体'),'美容室':('美容・施術','美容室・理容室'),'学習塾':('教室・運動','学習塾'),'レンタルスペース':('場所貸し','レンタルスペース'),'ペットサロン':('暮らし・ペット','ペットサロン')}
async def walk(pg,biz):
  await pg.evaluate("localStorage.clear()");await pg.reload();await pg.wait_for_timeout(1200)
  cat,sub=CAT.get(biz,(biz,None))
  await pg.locator('[data-ivopt="first"]').first.click();await pg.wait_for_timeout(120)
  await pg.get_by_role('button',name='次へ').first.click();await pg.wait_for_timeout(150)
  await pg.locator('[data-ivopt]',has_text=cat).first.click();await pg.wait_for_timeout(120)
  if sub:await pg.locator('[data-ivbiz]',has_text=sub).first.click();await pg.wait_for_timeout(120)
  await pg.get_by_role('button',name='次へ').first.click();await pg.wait_for_timeout(150)
  for i in range(80):
    t=await pg.evaluate("document.body.innerText")
    if 'お店を始めるまでの全部' in t: return 'HOME'
    for name in ['この試算で、お店の画面へ進む','この内容を残す','計画を見る']:
      loc=pg.get_by_role('button',name=name)
      if await loc.count():
        await loc.first.click();await pg.wait_for_timeout(200);break
    else:
      # fill inputs
      for inp in await pg.query_selector_all('input[type=number],input[inputmode=numeric],input[inputmode=decimal]'):
        if await inp.is_visible() and not await inp.input_value():
          u=await inp.evaluate("e=>(e.parentElement.innerText||'')")
          await inp.fill('1200' if '円' in u else '12')
      for inp in await pg.query_selector_all('input[type=text],textarea'):
        if await inp.is_visible() and not await inp.input_value():
          await inp.fill('テスト')
      btns=await pg.query_selector_all('button')
      for bt in btns:
        tx=(await bt.inner_text()).strip()
        if tx and tx not in SKIP and await bt.is_visible() and not await bt.evaluate("b=>b.classList.contains('on')||b.closest('header')"):
          try:await bt.click(timeout=800)
          except Exception:pass
          break
      await pg.wait_for_timeout(80)
      nx=pg.get_by_role('button',name='次へ')
      if not await nx.count():nx=pg.get_by_role('button',name='試算を見る')
      if await nx.count():
        try:await nx.first.click(timeout=800)
        except Exception:
          sk=pg.get_by_role('button',name='今は飛ばす')
          if await sk.count():await sk.first.click()
      await pg.wait_for_timeout(120)
  return (await pg.evaluate("document.body.innerText"))[:200]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={'width':393,'height':852})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('http://localhost:8765/plan/');await pg.wait_for_timeout(1200)
    for biz in ['カフェ','居酒屋','持ち帰りの店','パン・ケーキ','サロン','美容室','学習塾','レンタルスペース','ペットサロン']:
      r=await walk(pg,biz);print(biz,r.replace('\n','|')[:150],await pg.evaluate("cur"))
    print(errs);await b.close()
if __name__=='__main__':asyncio.run(main())
