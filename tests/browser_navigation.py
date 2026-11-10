"""Live browser regressions. Run: python3 tests/browser_navigation.py

Requires the dev server and a managed, signed-in test session. Does not submit
forms, claim roles, change account settings, or create test data.
"""

import asyncio
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright, expect

ORIGIN = "http://localhost:8080"
SCREENSHOTS = Path("/tmp/browser/route-history-refresh")
PAGES = [
    ("/", "VA Navigator | Find Veteran mental-health care", None),
    ("/auth", "Sign in | VA Navigator", "Sign in"),
    ("/reset-password", "Set a new password | VA Navigator", "Set a new password"),
    ("/questionnaire", "Quick questions | VA Navigator", "Quick questions"),
    ("/appointment-prep", "Prepare for your appointment | VA Navigator", "Prepare for your appointment"),
    ("/helpful-links", "Helpful links | VA Navigator", "Helpful links"),
    ("/security", "Data storage & security | VA Navigator", "Data storage & security"),
    ("/account", "My account | VA Navigator", "My account"),
    ("/history", "My search history | VA Navigator", "My search history"),
    ("/admin", "Admin | VA Navigator", "Admin"),
]
LINKS = [
    (3, "Quick questions"), (4, "Appointment prep"), (5, "Helpful links"),
    (6, "Privacy & security"), (7, "My account"), (8, "History"), (9, "Admin"),
]


async def check_destination(page, index):
    path, title, heading = PAGES[index]
    # Wait for document scripts and hydration before accepting SSR landmarks
    # or starting another navigation. Otherwise the previous document can
    # still hydrate after the next URL has already been requested.
    await page.wait_for_load_state("networkidle", timeout=30000)
    await expect(page).to_have_title(title, timeout=20000)
    assert urlparse(page.url).path == path, f"Wrong destination for {path}"
    main = page.get_by_role("main")
    await expect(main).to_be_visible()
    h1 = main.get_by_role("heading", level=1, **({"name": heading, "exact": True} if heading else {}))
    await expect(h1).to_be_visible()
    await expect(page.get_by_role("navigation")).to_be_visible()
    await expect(page.get_by_role("complementary", name="Veterans Crisis Line")).to_be_visible()
    if path == "/account":
        await expect(main.get_by_role("button", name="Sign out", exact=True)).to_be_visible()
        await expect(main.get_by_role("button", name="Turn on sign-in codes", exact=True)).to_be_visible(timeout=20000)
    if path == "/history":
        # A list or the real empty state must finish loading.
        await expect(main.get_by_text("Loading…", exact=True)).to_have_count(0)
    if path == "/admin":
        await expect(main.get_by_role("button", name="Export summary")).to_be_visible(timeout=20000)
    if path == "/auth":
        await expect(main.get_by_role("textbox", name="Email", exact=True)).to_be_visible()


async def restore_session(context, page):
    if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS") == "injected":
        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        cookies = json.loads(os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON") or "[]")
    else:
        session_file = Path.home() / ".cache/lovable-auth/session.json"
        if not session_file.exists():
            raise RuntimeError("A managed browser test session is required")
        minted = json.loads(session_file.read_text())
        storage_key = minted["storage_key"]
        session_json = json.dumps(minted["session"])
        cookies = minted.get("cookies") or []
    if cookies:
        await context.add_cookies([{**cookie, "url": ORIGIN} for cookie in cookies])
    await page.goto(ORIGIN)
    await page.evaluate("([k,v]) => window.localStorage.setItem(k,v)", [storage_key, session_json])
    await page.goto(ORIGIN)


async def main():
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        await restore_session(context, page)

        # Actual document requests and reloads, not router invalidation or remounts.
        for index, (path, _, _) in enumerate(PAGES):
            response = await page.goto(ORIGIN + path, wait_until="domcontentloaded")
            assert response and response.ok, f"Direct request failed for {path}"
            await check_destination(page, index)
            response = await page.reload(wait_until="domcontentloaded")
            assert response and response.ok, f"Refresh request failed for {path}"
            await check_destination(page, index)
            await page.get_by_role("main").screenshot(path=str(SCREENSHOTS / f"refresh-{index}.png"))
            print(f"PASS direct load and browser refresh: {path}")

        await page.goto(ORIGIN)
        await check_destination(page, 0)
        journey = [0]
        for index, name in LINKS:
            await page.get_by_role("navigation").get_by_role("link", name=name, exact=True).click()
            await check_destination(page, index)
            journey.append(index)
        # go_back/go_forward invoke the same browser history as toolbar buttons.
        for index in reversed(journey[:-1]):
            await page.go_back()
            await check_destination(page, index)
        for index in journey[1:]:
            await page.go_forward()
            await check_destination(page, index)
        await page.get_by_role("main").screenshot(path=str(SCREENSHOTS / "history-final.png"))
        print("PASS browser back and forward across signed-in route links")

        # Reset is entered from an email; sign-in is visible in a signed-out tab.
        public = await browser.new_context(viewport={"width": 1280, "height": 1800})
        public_page = await public.new_page()
        public_page.on("pageerror", lambda error: errors.append(str(error)))
        await public_page.goto(ORIGIN + "/reset-password")
        await check_destination(public_page, 2)
        for index, name in [(1, "Sign in"), (3, "Quick questions")]:
            await public_page.get_by_role("navigation").get_by_role("link", name=name, exact=True).click()
            await check_destination(public_page, index)
        for index in [1, 2]:
            await public_page.go_back()
            await check_destination(public_page, index)
        for index in [1, 3]:
            await public_page.go_forward()
            await check_destination(public_page, index)
        print("PASS browser back and forward across reset and sign-in routes")
        assert not errors, "Browser runtime errors occurred"
        await browser.close()
        print("PASS all browser navigation and refresh checks; no runtime errors")


if __name__ == "__main__":
    asyncio.run(main())