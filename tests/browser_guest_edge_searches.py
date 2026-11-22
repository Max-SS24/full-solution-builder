"""Live browser regression checks for guest (signed-out) searches that are empty, ambiguous or unsupported.

Each case runs in a fresh signed-out browser against the dev server (:8080) and checks the reply, the
results area, the free-search counter and any fallback guidance. Guest usage created here is deleted at
the end so runs never use real visitors' allowance. Needs SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.
Run: python3 tests/browser_guest_edge_searches.py"""
import asyncio, hashlib, os, re, sys
from pathlib import Path
import requests
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SHOTS = Path("/tmp/browser/guest-edge"); SHOTS.mkdir(parents=True, exist_ok=True)
URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SVC = {"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}"}
BOT = "[role=dialog] p.w-fit:not(.ml-auto)"  # assistant bubbles in the chat dialog
# Fixed guided-search wording (src/lib/navigator.functions.ts, src/lib/guest-limit.ts).
ASK_NEED = "What would you like support with? For example PTSD, depression, anxiety, grief, or substance use."
ASK_PLACE = "What city and state (or ZIP) should I search near?"
OFFER = "Would you like to see your results now?"
GUEST_NOTE = "Guests use the built-in guided search. Sign in or create a free account for the full chat assistant."
EMPTY_HEADING = "Your care options will appear here"
OFFICIAL = ("https://www.va.gov/", "https://www.samhsa.gov/", "https://findtreatment.gov/")
failures: list[str] = []
guest_ids: list[str] = []


def check(ok: bool, label: str):
    print(("PASS " if ok else "FAIL ") + label)
    if not ok: failures.append(label)


async def open_guest(browser):
    ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
    page = await ctx.new_page()
    await page.goto(BASE, wait_until="domcontentloaded"); await page.wait_for_timeout(2500)
    return ctx, page


async def say(page, text: str) -> str:
    """Sends one chat message and returns the newest assistant reply ("" once the dialog closes for results)."""
    box = page.locator("#msg-big")
    if not await box.is_visible(): await page.locator("#msg").click()
    await box.wait_for(timeout=10000)
    await box.fill(text); await box.press("Enter")
    await page.wait_for_timeout(1000)
    await page.locator("text=Thinking…").wait_for(state="detached", timeout=90000)
    await page.wait_for_timeout(700)
    gid = await page.evaluate("() => localStorage.getItem('van_guest')")
    if gid and gid not in guest_ids: guest_ids.append(gid)
    bot = page.locator(BOT)
    return (await bot.last.inner_text()).strip() if await bot.count() else ""


async def state(page) -> dict:
    """What the person sees after closing the chat: counter, results heading, listings, fallback steps."""
    if await page.get_by_role("dialog").count(): await page.keyboard.press("Escape")
    await page.wait_for_timeout(2000)
    main = await page.inner_text("main")
    heading = await page.locator("h2").filter(has_text=re.compile(r"care options|No matches yet")).first.inner_text()
    steps = page.locator("section, div").filter(has=page.get_by_role("heading", name=re.compile(r"^Next steps for"))).last
    return {
        "left": int(m.group(1)) if (m := re.search(r"(\d) of 5 free searches left", main)) else None,
        "heading": heading.strip(),
        "listings": await page.locator("article").count(),
        "miles": await page.locator("article").filter(has_text=re.compile(r"\bmiles? away\b")).count(),
        "note": GUEST_NOTE in main,
        "steps_heading": (await page.get_by_role("heading", name=re.compile(r"^Next steps for")).all_inner_texts()),
        "step_links": [await a.get_attribute("href") for a in await steps.locator("a[href^='http']").all()] if await steps.count() else [],
        "location_chip": (m.group(0) if (m := re.search(r"Location: [^\n]+", main)) else None),
    }


async def case_blank(browser):
    ctx, page = await open_guest(browser)
    await page.locator("#msg").click()
    box = page.locator("#msg-big"); await box.wait_for()
    await box.fill("   \n  ")
    send = page.get_by_role("dialog").get_by_role("button", name=re.compile("Send"))
    check(await send.is_disabled(), "blank: Send stays disabled for a message of only spaces")
    before = await page.locator(BOT).count()
    await box.press("Enter"); await page.wait_for_timeout(1500)
    check(await page.locator(BOT).count() == before and await page.locator("[role=dialog] p.ml-auto").count() == 0, "blank: pressing Enter sends nothing")
    s = await state(page)
    check(s["left"] == 5 and s["heading"] == EMPTY_HEADING and s["listings"] == 0, "blank: no results and all 5 free searches left")
    await ctx.close()


async def case_no_details(browser):
    ctx, page = await open_guest(browser)
    reply = await say(page, "hi")
    check(reply.endswith(ASK_NEED), "no details ('hi'): guided search asks what support they want")
    s = await state(page)
    check(s["heading"] == EMPTY_HEADING and s["listings"] == 0, "no details: no results shown yet")
    check(s["left"] == 5, "no details: no free search used")
    check(s["note"], "no details: guest guided-search note is shown")
    await page.screenshot(path=str(SHOTS / "no_details.png")); await ctx.close()


async def case_vague_need(browser):
    ctx, page = await open_guest(browser)
    reply = await say(page, "I need help")
    check(reply.endswith(ASK_NEED), "ambiguous need ('I need help'): asks what support they want")
    s = await state(page)
    check(s["listings"] == 0 and s["left"] == 5, "ambiguous need: no results and no free search used")
    await ctx.close()


async def case_city_without_state(browser):
    ctx, page = await open_guest(browser)
    reply = await say(page, "I'm in Springfield and need help with depression")
    check(reply.endswith(ASK_PLACE), "ambiguous place ('Springfield', no state): asks for city and state or ZIP")
    check(OFFER not in reply, "ambiguous place: does not offer results for a guessed state")
    s = await state(page)
    check(s["listings"] == 0 and s["left"] == 5, "ambiguous place: no results and no free search used")
    await ctx.close()


async def case_skips_location(browser):
    ctx, page = await open_guest(browser)
    r1 = await say(page, "I need PTSD help")
    check(r1.endswith(ASK_PLACE), "no location given: asks where to search")
    r2 = await say(page, "show me results now")
    check(r2.endswith(OFFER), "skipped location: offers results instead of asking again")
    await say(page, "yes")
    s = await state(page)
    await page.screenshot(path=str(SHOTS / "skips_location.png"))
    check(s["listings"] > 0, f"skipped location: results are shown ({s['listings']} listings)")
    check(s["location_chip"] == "Location: not set", "skipped location: search summary says location is not set")
    check(s["miles"] == 0, "skipped location: no distances are shown, none invented")
    check(s["left"] == 4, "skipped location: exactly one free search used")
    await ctx.close()


async def case_outside_us(browser, msg: str, label: str):
    ctx, page = await open_guest(browser)
    r1 = await say(page, msg)
    check(r1.endswith(ASK_PLACE) and OFFER not in r1, f"unsupported place ({label}): asks for a U.S. city/state or ZIP")
    s = await state(page)
    check(s["listings"] == 0 and s["heading"] == EMPTY_HEADING, f"unsupported place ({label}): no listings shown")
    check(s["left"] == 5, f"unsupported place ({label}): no free search used")
    await ctx.close()


async def case_territory(browser):
    ctx, page = await open_guest(browser)
    r1 = await say(page, "I live in Saipan, Northern Mariana Islands, I need grief counseling from a community provider, one-on-one, in person")
    if OFFER in r1: await say(page, "yes")
    s = await state(page)
    await page.screenshot(path=str(SHOTS / "territory.png"))
    if s["listings"]:
        check(s["heading"].startswith(f"{s['listings']} care options"), f"territory: {s['listings']} listings shown with a matching heading")
    else:
        check(s["steps_heading"] == ["Next steps for the Northern Mariana Islands"], "territory with no listings: shows fixed next steps for the area")
        check(bool(s["step_links"]) and all(h.startswith(OFFICIAL) for h in s["step_links"]), "territory next steps link only to official VA.gov / SAMHSA / FindTreatment pages")
        check(not any("va.gov" in h for h in s["step_links"]), "community-only territory next steps leave out VA links")
    check(s["listings"] > 0 or bool(s["steps_heading"]), "territory: never ends with nothing to show")
    check(s["left"] == 4, "territory: exactly one free search used")
    await ctx.close()


def remove_guest_usage():
    for gid in guest_ids:
        for ip in ("", "127.0.0.1", "::1"):
            k = "g:" + hashlib.sha256(f"guest|{gid}|{ip}".encode()).hexdigest()
            requests.delete(f"{URL}/rest/v1/guest_usage?key=eq.{k}", headers=SVC, timeout=30)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            await case_blank(browser)
            await case_no_details(browser)
            await case_vague_need(browser)
            await case_city_without_state(browser)
            await case_skips_location(browser)
            await case_outside_us(browser, "I'm in London, England and need PTSD counseling", "London, England")
            await case_outside_us(browser, "Toronto, Canada, anxiety, community provider", "Toronto, Canada")
            await case_territory(browser)
        finally:
            remove_guest_usage()
            await browser.close()
    print(f"\n{'ALL PASSED' if not failures else f'{len(failures)} FAILED'}")
    sys.exit(1 if failures else 0)

asyncio.run(main())
