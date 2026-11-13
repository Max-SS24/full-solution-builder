"""Shared helpers for live access tests: real REST calls as visitor, non-admin, admin and backend."""
import json, os, secrets, requests

URL = os.environ["SUPABASE_URL"].rstrip("/")
ANON = os.environ["SUPABASE_PUBLISHABLE_KEY"]
SERVICE = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def headers(token=None, key=ANON):
    h = {"apikey": key, "Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def rpc(name, args, token=None, key=ANON):
    r = requests.post(f"{URL}/rest/v1/rpc/{name}", headers=headers(token, key), json=args, timeout=30)
    return r.status_code, (r.json() if r.content else None)


def select(table, query, token=None, key=ANON):
    r = requests.get(f"{URL}/rest/v1/{table}?{query}", headers=headers(token, key), timeout=30)
    r.raise_for_status()
    return r.json()


def admin_session():
    """Managed session of the signed-in admin (lovable auth-session --self)."""
    if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS") == "injected":
        s = json.loads(os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"])
    else:
        s = json.load(open(os.path.expanduser("~/.cache/lovable-auth/session.json")))["session"]
    return s["access_token"], s["user"]["id"], s["user"]["email"]


class TempUser:
    """Throwaway non-admin account, deleted on exit."""
    def __enter__(self):
        self.email = f"zz-access-test-{secrets.token_hex(4)}@example.com"
        pw = secrets.token_urlsafe(18) + "Aa1!"
        r = requests.post(f"{URL}/auth/v1/admin/users", headers=headers(SERVICE, SERVICE),
                          json={"email": self.email, "password": pw, "email_confirm": True}, timeout=30)
        r.raise_for_status()
        self.id = r.json()["id"]
        r = requests.post(f"{URL}/auth/v1/token?grant_type=password", headers=headers(),
                          json={"email": self.email, "password": pw}, timeout=30)
        r.raise_for_status()
        self.token = r.json()["access_token"]
        return self

    def __exit__(self, *exc):
        requests.delete(f"{URL}/auth/v1/admin/users/{self.id}", headers=headers(SERVICE, SERVICE), timeout=30)
