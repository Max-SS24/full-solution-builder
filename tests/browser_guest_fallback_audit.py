"""Live browser regression checks (Python Playwright, dev server on :8080):
1. Guest chat fallback: signed-out visitors get the built-in guided search (fixed questions, guest note), never the AI assistant.
2. Provider word matching: guest "What matters most" comparisons use the built-in word match and label it as such.
3. Email-free admin activity log: the Audit log tab shows account numbers only, and the database refuses emails.

Needs a managed admin session (`lovable auth-session --json --self`) and SUPABASE_* env vars. Run: python3 tests/browser_guest_fallback_audit.py
Guest usage created by this run is removed at the end so it never eats real visitors' allowance."""
import asyncio, hashlib, json, os, re, sys
from pathlib import Path
import requests
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SHOTS = Path("/tmp/browser/guest-audit"); SHOTS.mkdir(parents=True, exist_ok=True)
URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SVC = {"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}", "Content-Type": "application/json"}
# Fixed text from src/lib/guest-limit.ts and src/lib/basic-match.ts.
GUEST_NOTE = "Guests use the built-in guided search. Sign in or create a free account for the full chat assistant."
WORD_MATCH = "These listings share the most words with what you said matters. This is a simple word match, so read each listing and call to confirm."
NO_WORD_MATCH = "None of these listings mention what you described. Try different words, or call a provider to ask."
GUIDED_OPENERS = ("I'm sorry you're carrying this, and I'm glad you reached out.", "Got it.")
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
failures: list[str] = []


def check(ok: bool, label: str):
    print(("PASS " if ok else "FAIL ") + label)
    if not ok: failures.append(label)


def session():
    if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS") == "injected":
        return os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"], json.loads(os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"])
    m = json.load(open(os.path.expanduser("~/.cache/lovable-auth/session.json")))
    return m["storage_key"], m["session"]


BOT = "[role=dialog] p.w-fit:not(.ml-auto)"  # assistant bubbles in the chat dialog


async def say(page, text: str, server_bodies: list[str]):
    """Sends one chat message; returns the newest assistant reply and the server responses it caused."""
    box = page.locator("#msg-big")
    if not await box.is_visible(): await page.locator("#msg").click()
    await box.wait_for(timeout=10000)
    start = len(server_bodies)
    await box.fill(text); await box.press("Enter")
    await page.wait_for_timeout(1000)
    await page.locator("text=Thinking…").wait_for(state="detached", timeout=90000)
    await page.wait_for_timeout(700)
    bot = page.locator(BOT)  # the dialog closes itself once results are shown
    return ((await bot.last.inner_text()).strip() if await bot.count() else ""), server_bodies[start:]


async def guest_flow(browser, held: dict):
    ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
    page = await ctx.new_page()
    bodies: list[str] = []
    async def grab(r):
        if "_serverFn" in r.url:
            try: bodies.append(await r.text())
            except Exception: pass
    page.on("response", lambda r: asyncio.ensure_future(grab(r)))
    await page.goto(BASE, wait_until="domcontentloaded"); await page.wait_for_timeout(2500)

    answers = [
        (r"VA, a community provider", "A community provider please"),
        (r"one-on-one therapy or a support group", "One-on-one therapy"),
        (r"in person, by video, or by phone", "In person"),
        (r"applied for VA health care", "No"),
        (r"see your results", "Yes"),
    ]
    reply, sent = await say(page, "I'm a veteran in Atlanta, GA dealing with PTSD and I have Tricare.", bodies)
    held["gid"] = await page.evaluate("() => localStorage.getItem('van_guest')")  # cleaned up even if a check crashes
    replies = [reply]; responses = list(sent)
    for _ in range(6):
        if re.search(r"see your results", replies[-1], re.I):
            r, s = await say(page, "Yes", bodies); replies.append(r); responses += s; break
        nxt = next((a for pat, a in answers if re.search(pat, replies[-1], re.I)), "No other details, please show results")
        r, s = await say(page, nxt, bodies); replies.append(r); responses += s
    await page.screenshot(path=str(SHOTS / "1_guest_chat.png"))

    check(all(any(r.startswith(o) for o in GUIDED_OPENERS) for r in replies if r), "guest replies use the built-in guided wording")
    check(sum(bool(re.search(r"\?\s*$", r)) for r in replies[:-1]) == len(replies) - 1, "guest guided search asks one question per turn")
    check(any(GUEST_NOTE in b for b in responses), "server reports guest note (no AI assistant) for signed-out chat")
    check(all("AI unavailable" not in b for b in responses), "guest chat never attempts the AI provider")
    await page.keyboard.press("Escape"); await page.wait_for_timeout(2500)
    check(await page.get_by_text(GUEST_NOTE).count() > 0, "guest note is visible next to the chat")
    check(await page.get_by_text(re.compile("miles away|📍")).count() > 0, "guest guided search still returns care results")

    # 2. Provider word matching for guests.
    prio = page.locator("#prio")
    await prio.scroll_into_view_if_needed(timeout=15000)
    await prio.fill("A veteran who offers video visits, evenings, and takes Tricare")
    await page.get_by_role("button", name=re.compile("Find my best matches")).click()
    await page.wait_for_function("t => document.body.innerText.includes(t[0]) || document.body.innerText.includes(t[1])", arg=[WORD_MATCH, NO_WORD_MATCH], timeout=40000)
    matcher = page.locator("div", has=page.get_by_role("heading", name="What matters most in a provider?")).last
    text = await matcher.inner_text()
    await matcher.screenshot(path=str(SHOTS / "2_word_match.png"))
    check(WORD_MATCH in text or NO_WORD_MATCH in text, "guest comparison shows the plain word-match summary")
    whys = re.findall(r"^This listing .+$", text, re.M)
    fits = re.findall(r"(strong|good|partial) fit", text, re.I)
    check(len(whys) == len(fits) and len(fits) <= 3, f"each word match explains itself ('This listing …'), at most 3 ({len(fits)} shown)")
    if WORD_MATCH in text:
        check(any(re.search(r"mentions .*(telehealth|video|virtual|veteran|military|tricare)", w, re.I) for w in whys), "word matches cite the guest's own words (video→telehealth, veteran, Tricare)")

    await ctx.close()


async def signed_in_contrast(browser, key, sess):
    ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
    page = await ctx.new_page()
    bodies: list[str] = []
    async def grab(r):
        if "_serverFn" in r.url:
            try: bodies.append(await r.text())
            except Exception: pass
    page.on("response", lambda r: asyncio.ensure_future(grab(r)))
    await page.goto(BASE); await page.evaluate("([k,v])=>localStorage.setItem(k,v)", [key, json.dumps(sess)])
    await page.goto(BASE); await page.wait_for_timeout(3000)
    _, sent = await say(page, "Hi, I'm looking for some help near Atlanta, GA.", bodies)
    check(sent and all(GUEST_NOTE not in b for b in sent), "signed-in chat does not get the guest note")
    await ctx.close()


async def audit_log(browser, key, sess):
    uid, email = sess["user"]["id"], sess["user"]["email"].lower()
    ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
    page = await ctx.new_page()
    audit_json: list[str] = []
    async def grab(r):
        if "/rest/v1/audit_log" in r.url:
            try: audit_json.append(await r.text())
            except Exception: pass
    page.on("response", lambda r: asyncio.ensure_future(grab(r)))
    await page.goto(BASE); await page.evaluate("([k,v])=>localStorage.setItem(k,v)", [key, json.dumps(sess)])
    await page.goto(BASE + "/admin")
    # Fresh, harmless entry: re-save the AI settings unchanged.
    await page.get_by_role("tab", name="AI service", exact=True).click(timeout=30000)
    await page.get_by_role("heading", name="AI service").wait_for()
    await page.get_by_role("button", name="Save", exact=True).click()
    await page.get_by_text("AI settings saved").wait_for(timeout=15000)
    await page.get_by_role("tab", name="Audit log", exact=True).click()
    table = page.locator("table").filter(has=page.get_by_role("columnheader", name="Who"))
    await table.get_by_role("row").nth(1).wait_for(timeout=20000)
    for _ in range(30):  # wait for the fresh entry to reach the top
        if f"account {uid[:8]}" in await table.get_by_role("row").nth(1).inner_text(): break
        await page.wait_for_timeout(500)
    await page.screenshot(path=str(SHOTS / "3_audit_log.png"))
    first = await table.get_by_role("row").nth(1).locator("td").all_inner_texts()
    who_cells = await table.locator("tbody tr td:nth-child(2)").all_inner_texts()
    check(len(first) == 5 and first[1] == f"Admin (account {uid[:8]})" and first[3] == "AI settings", "new entry shows 'Admin (account …)' and 'AI settings', no email")
    labels = sorted({w for w in who_cells if not re.fullmatch(r"Admin \(account [0-9a-f]{8}\)", w)})
    check(all("@" not in w for w in who_cells), f"every 'Who' cell is an account number or a system label ({len(who_cells)} rows; other labels: {labels})")
    page_text = (await page.inner_text("main")).lower()
    check(email not in page_text and not EMAIL.search(await table.inner_text()), "no email address anywhere in the activity log table")
    rows = [r for b in audit_json for r in (json.loads(b) if b.startswith("[") else [])]
    check(bool(rows) and all(r.get("actor_email") in (None, "") or "@" not in r["actor_email"] for r in rows), f"activity log data sent to the browser has no emails ({len(rows)} rows)")
    check(all(email not in json.dumps(r.get("details")).lower() for r in rows if r.get("entity") in ("admin_roles", "password_reset")), "admin and password-reset entries carry no email details")
    await ctx.close()

    # Database refuses an email even from the backend.
    r = requests.post(f"{URL}/rest/v1/audit_log", headers={**SVC, "Prefer": "return=representation"},
                      json={"actor_email": "regression-check@example.com", "action": "test", "entity": "regression_test", "details": {}}, timeout=30)
    if r.ok:
        for row in r.json(): requests.delete(f"{URL}/rest/v1/audit_log?id=eq.{row['id']}", headers=SVC, timeout=30)
    check(r.status_code == 400 and "audit_log_no_email" in r.text, "database rejects saving an email in the activity log")


def remove_guest_usage(gid):
    if not gid: return
    for ip in ("", "127.0.0.1", "::1"):
        k = "g:" + hashlib.sha256(f"guest|{gid}|{ip}".encode()).hexdigest()
        requests.delete(f"{URL}/rest/v1/guest_usage?key=eq.{k}", headers=SVC, timeout=30)


async def main():
    key, sess = session()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        held: dict = {}
        try:
            await guest_flow(browser, held)
            await signed_in_contrast(browser, key, sess)
            await audit_log(browser, key, sess)
        finally:
            remove_guest_usage(held.get("gid"))
            await browser.close()
    print(f"\n{'ALL PASSED' if not failures else f'{len(failures)} FAILED'}")
    sys.exit(1 if failures else 0)

asyncio.run(main())
