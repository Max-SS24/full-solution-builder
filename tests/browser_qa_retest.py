import asyncio, json, os, re
from pathlib import Path
from playwright.async_api import async_playwright
S=Path("/tmp/browser/qa/shots"); S.mkdir(parents=True, exist_ok=True)
m=json.load(open(os.path.expanduser("~/.cache/lovable-auth/session.json")))
async def chat(page, text, wait=90):
    box=page.locator("#msg-big")
    if not await box.is_visible(): await page.locator("#msg").click()
    await box.wait_for(timeout=10000)
    n=await page.locator("text=Thinking…").count()
    await box.fill(text); await box.press("Enter")
    await page.wait_for_timeout(1500)
    await page.locator("text=Thinking…").wait_for(state="detached", timeout=wait*1000)
    await page.wait_for_timeout(800)
async def fresh(b, signed=True):
    ctx=await b.new_context(viewport={"width":1280,"height":1800}, accept_downloads=True)
    p=await ctx.new_page()
    await p.goto("http://localhost:8080")
    if signed:
        await p.evaluate("([k,v])=>localStorage.setItem(k,v)",[m["storage_key"],json.dumps(m["session"])])
        await p.goto("http://localhost:8080")
    await p.wait_for_timeout(2500); return ctx,p
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(headless=True)
    # VA-004 crisis without location
    ctx,p=await fresh(b)
    await chat(p,"I don't see a point anymore and I want to end it")
    await p.keyboard.press("Escape"); await p.wait_for_timeout(1000)
    body=await p.inner_text("body")
    print("VA-004 crisis banner:", "Veterans Crisis Line" in body, "| closest-matches line:", "closest care matches" in body, "| Atlanta shown:", "Atlanta" in body and "miles away" in body)
    await p.screenshot(path=str(S/"crisis.png")); await ctx.close()
    # VA-002 / VA-005 / VA-006 Chicago with facility named
    ctx,p=await fresh(b)
    await chat(p,"I'm a veteran in Chicago, IL with PTSD. I want both VA and community options, in person therapy, I have Tricare.")
    await chat(p,"Yes I've applied and I'm registered at Jesse Brown VA Medical Center")
    for _ in range(3):
        last=await p.inner_text("body")
        if re.search(r"see your results", last, re.I): break
        await chat(p,"No other details, please show results")
    await chat(p,"Yes")
    await p.keyboard.press("Escape"); await p.wait_for_timeout(3000)
    body=await p.inner_text("body")
    print("VA-002 community listings kept:", "FindTreatment" in body or "NPI" in body, "| VA listings:", "VA Medical Center" in body)
    print("VA-001/RT-01 out-of-state cities:", sorted(set(re.findall(r"📍 [^,]+, ([A-Z]{2})", body))))
    empty=await p.locator('a[href=""]').count(); print("VA-005 empty source links:", empty, "| no-link notes:", body.count("No source link available"))
    labels=sorted(set(re.findall(r"Last verified on ([^:]+):", body))); print("VA-006 labels:", labels)
    print("VA-008 own facility card:", "Your VA facility" in body and "Jesse Brown" in body)
    await p.screenshot(path=str(S/"chicago.png"))
    # VA-007 telehealth
    mbox=p.get_by_role("textbox", name=re.compile("matters most", re.I))
    if await mbox.count():
        await mbox.first.fill("I need someone who offers telehealth video visits")
        await p.get_by_role("button", name=re.compile("compare|match|find", re.I)).last.click()
        await p.wait_for_timeout(25000)
        sec=await p.inner_text("body"); print("VA-007 says none offer telehealth:", bool(re.search(r"(none|no one|not).{0,40}telehealth", sec, re.I)))
    else: print("VA-007 matcher box not found")
    await ctx.close()
    # VA-008 Hines
    ctx,p=await fresh(b)
    await chat(p,"I'm in Hines, IL, VA care only, PTSD, in person therapy. I've applied and I'm registered at Edward Hines Junior Hospital in Hines, IL")
    for _ in range(3):
        last=await p.inner_text("body")
        if re.search(r"see your results", last, re.I): break
        await chat(p,"No other details, please show results")
    await chat(p,"Yes"); await p.keyboard.press("Escape"); await p.wait_for_timeout(3000)
    sec=p.get_by_role("region", name="Your VA facility")
    print("VA-008 Hines matched:", (await sec.inner_text()).replace("\n"," | ")[:200] if await sec.count() else "no card")
    await ctx.close()
    # VA-010 download
    ctx,p=await fresh(b); await p.goto("http://localhost:8080/account"); await p.wait_for_timeout(4000)
    async with p.expect_download() as d: await p.get_by_role("button", name="Download my data").click()
    f=await (await d.value).path(); data=json.load(open(f))
    print("VA-010 export keys:", list(data), "history rows:", len(data["search_history"]))
    await b.close()
asyncio.run(main())
