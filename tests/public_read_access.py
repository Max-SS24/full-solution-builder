"""Regression test: visitors can still use public search data and view link checks.
Real signed-out REST reads plus a signed-out browser pass. Run: python3 tests/public_read_access.py
"""
import asyncio, sys
from live_helpers import select, SERVICE
from playwright.async_api import async_playwright

fails = []
def check(label, ok, info=""):
    print(("PASS " if ok else "FAIL ") + label + (f" ({info})" if info else ""))
    if not ok: fails.append(label)

opts = select("care_options", "select=id,status,source_id&limit=200")
check("visitor reads listings", len(opts) > 0, f"{len(opts)} rows")
check("only active/needs_review listings", all(o["status"] in ("active", "needs_review") for o in opts))
srcs = select("data_sources", "select=id,enabled")
check("visitor reads data sources", len(srcs) > 0)
check("no disabled sources visible", all(s["enabled"] for s in srcs))
enabled = {s["id"] for s in srcs}
check("listings only from enabled sources", all(o["source_id"] in enabled for o in opts))
removed = select("care_options", "select=id&status=eq.removed&limit=1", SERVICE, SERVICE)
if removed:
    check("removed listing hidden", select("care_options", f"select=id&id=eq.{removed[0]['id']}") == [])
links = select("link_checks", "select=url,ok,checked_at")
check("visitor reads link checks", len(links) > 0, f"{len(links)} rows")
official = r"(va\.gov|samhsa\.gov|findtreatment\.gov|988lifeline\.org)"
import re
check("only official link checks", all(re.match(rf"^https://([a-z0-9-]+\.)*{official}(/|$)", l["url"]) for l in links))
prep = select("prep_fact_checks", "select=source_url")
check("visitor reads VA.gov prep checks", len(prep) > 0)

async def browser():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await (await b.new_context(viewport={"width": 1280, "height": 1800})).new_page()
        bad = []
        page.on("response", lambda r: bad.append(f"{r.status} {r.url}") if "/rest/v1/" in r.url and r.status >= 400 else None)
        await page.goto("http://localhost:8080/helpful-links", wait_until="networkidle")
        txt = await page.inner_text("main")
        check("helpful links page shows verified dates", "Verified" in txt or "verified" in txt)
        await page.goto("http://localhost:8080/", wait_until="networkidle")
        check("home page loads signed out", await page.locator("main").count() == 1)
        check("no access errors from database", not bad, "; ".join(bad))
        await b.close()
asyncio.run(browser())
sys.exit(f"{len(fails)} failed" if fails else 0)
