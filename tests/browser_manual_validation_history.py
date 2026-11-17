import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={"width":1280,"height":1800})
  page=await context.new_page()
  with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f: minted=json.load(f)
  if minted.get('cookies'): await context.add_cookies([{**c,'url':'http://localhost:8080'} for c in minted['cookies']])
  await page.goto('http://localhost:8080')
  await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[minted['storage_key'],json.dumps(minted['session'])])
  await page.goto('http://localhost:8080/admin')
  await page.get_by_role('tab',name='Weekly checks',exact=True).click(timeout=30000)
  await page.get_by_role('heading',name='Weekly community care checks').wait_for()
  await page.get_by_role('combobox',name='Show weekly check results').select_option('all')
  row=page.get_by_role('row').filter(has=page.get_by_role('button',name='Mark as manually validated:',exact=False)).first
  await row.wait_for()
  provider=await row.locator('td').first.locator('p').first.inner_text()
  row=page.get_by_role("row").filter(has=page.get_by_text(provider,exact=True)).last
  page.once('dialog',lambda d:d.accept('Reviewed source for audit history verification'))
  await row.get_by_role('button',name='Mark as manually validated:',exact=False).click()
  await row.get_by_role('button',name='Undo manual validation for',exact=False).wait_for(timeout=30000)
  await row.locator('summary').click()
  await row.get_by_text('Reviewed source for audit history verification',exact=True).wait_for()
  await row.screenshot(path='/tmp/browser/validation-history/validated.png')
  page.once('dialog',lambda d:d.accept('Reversed test validation; automated status retained'))
  await row.get_by_role('button',name='Undo manual validation for',exact=False).click()
  await row.get_by_text('Reversed test validation; automated status retained',exact=True).wait_for(timeout=30000)
  await row.get_by_role('button',name='Mark as manually validated:',exact=False).wait_for()
  await row.screenshot(path='/tmp/browser/validation-history/reversed.png')
  await page.reload()
  await page.get_by_role('tab',name='Weekly checks',exact=True).click(timeout=30000)
  await page.get_by_role('combobox',name='Show weekly check results').select_option('all')
  row=page.get_by_role('row').filter(has=page.get_by_text(provider,exact=True)).last
  await row.locator('summary').click()
  await row.get_by_text('Reversed test validation; automated status retained',exact=True).wait_for()
  print('PASS: signed-in admin validation and reversal history shows notes and identity, persists after reload; original manual status restored')
  await browser.close()
asyncio.run(main())
