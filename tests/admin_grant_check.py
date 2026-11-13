"""Regression test: admins can still check whether an account is already an admin; non-admins are refused.
Real REST calls plus a browser pass on the admin page. Run: python3 tests/admin_grant_check.py
"""
import asyncio, json, os, sys
from live_helpers import rpc, select, admin_session, TempUser, SERVICE
from playwright.async_api import async_playwright

fails = []
def check(label, ok, info=""):
    print(("PASS " if ok else "FAIL ") + label + (f" ({info})" if info else ""))
    if not ok: fails.append(label)

token, admin_id, email = admin_session()
roles_before = len(select("user_roles", "select=id&role=eq.admin", SERVICE, SERVICE))
audit_before = len(select("audit_log", "select=id&entity=eq.admin_roles", SERVICE, SERVICE))
status, body = rpc("grant_admin", {"_email": email}, token)
check("admin re-granting an admin gets 'already'", status == 200 and body == "already", f"{status} {body}")
with TempUser() as u:
    status, body = rpc("grant_admin", {"_email": email}, u.token)
    check("non-admin is refused", status >= 400 and "Forbidden" in json.dumps(body), f"{status}")

async def browser():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        s = json.load(open(os.path.expanduser("~/.cache/lovable-auth/session.json")))
        await page.goto("http://localhost:8080")
        await page.evaluate("([k, v]) => localStorage.setItem(k, v)", [s["storage_key"], json.dumps(s["session"])])
        await page.goto("http://localhost:8080/admin", wait_until="networkidle")
        await page.screenshot(path="/tmp/browser/admin_before.png")
        await page.get_by_role("tab", name="Admins").click()
        field = page.get_by_placeholder("their@email.com").first
        await field.fill(email)
        await field.press("Enter")
        await page.wait_for_timeout(3000)
        txt = (await page.inner_text("body")).lower()
        await page.screenshot(path="/tmp/browser/admin_grant.png")
        check("admin page says account is already an admin", "already an admin" in txt)
        await b.close()
os.makedirs("/tmp/browser", exist_ok=True)
asyncio.run(browser())
check("no new admin role", len(select("user_roles", "select=id&role=eq.admin", SERVICE, SERVICE)) == roles_before)
check("no new admin audit entry", len(select("audit_log", "select=id&entity=eq.admin_roles", SERVICE, SERVICE)) == audit_before)
sys.exit(f"{len(fails)} failed" if fails else 0)
