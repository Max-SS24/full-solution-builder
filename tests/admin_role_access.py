"""Regression test: people can only check their own admin status; admins and the backend keep access.
Uses real sign-ins (managed admin session + a throwaway non-admin that is deleted afterwards).
Run: python3 tests/admin_role_access.py
"""
import sys, uuid
from live_helpers import rpc, select, admin_session, TempUser, SERVICE

fails = []
def check(label, got, want):
    print(("PASS " if got == want else "FAIL ") + f"{label}: got {got!r}, want {want!r}")
    if got != want: fails.append(label)

def has_role(uid, token=None, key=None):
    kw = {"token": token} | ({"key": key} if key else {})
    status, body = rpc("has_role", {"_user_id": uid, "_role": "admin"}, **kw)
    return body if status == 200 else f"http {status}"

admin_token, admin_id, _ = admin_session()
random_id = str(uuid.uuid4())

check("visitor asks about admin", has_role(admin_id), False)
check("visitor asks about random id", has_role(random_id), False)
check("admin asks about self", has_role(admin_id, admin_token), True)
other = select("user_roles", f"select=user_id&role=eq.admin&user_id=neq.{admin_id}&limit=1", SERVICE, SERVICE)
if other: check("admin asks about another admin", has_role(other[0]["user_id"], admin_token), True)
check("admin asks about random id", has_role(random_id, admin_token), False)
with TempUser() as u:
    check("non-admin asks about self", has_role(u.id, u.token), False)
    check("non-admin asks about admin", has_role(admin_id, u.token), False)
    check("admin asks about non-admin", has_role(u.id, admin_token), False)
    check("backend asks about admin", has_role(admin_id, SERVICE, SERVICE), True)
    check("backend asks about non-admin", has_role(u.id, SERVICE, SERVICE), False)
check("empty id", has_role(None, admin_token), False)

sys.exit(f"{len(fails)} failed" if fails else 0)
