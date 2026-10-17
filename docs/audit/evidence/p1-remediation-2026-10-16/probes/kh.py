"""Tiny API client for the closure audit (env A = 8019, env B = 8020)."""
import json, os, sys
import requests
sys.stdout.reconfigure(encoding="utf-8")
QA_PW = os.environ["KHALSNI_QA_PASSWORD"]
PFX = "client-audit-qa-202610"
QA = {k: f"{PFX}-{k}@example.test" for k in ("admin", "employee", "customer_a", "customer_b", "provider_a", "provider_b")}
DEMO = {"admin": ("admin@khalisni.local", "Admin@123"), "customer": ("customer@khalisni.local", "Customer@123"),
        "employee": ("employee@khalisni.local", "Employee@123"), "provider": ("provider@khalisni.local", "Provider@123")}

class C:
    def __init__(self, port=8019, email=None, pw=None, lang="ar"):
        self.base = f"http://127.0.0.1:{port}/api"
        self.s = requests.Session()
        self.s.headers["Accept-Language"] = lang
        self.email = email
        if email:
            r = self.s.post(self.base + "/auth/login/", json={"email": email, "password": pw})
            if r.status_code != 200:
                raise RuntimeError(f"login {email}: {r.status_code} {r.text[:200]}")
            body = r.json()
            tok = body.get("access") or body.get("tokens", {}).get("access")
            self.login_body = body
            self.s.headers["Authorization"] = f"Bearer {tok}"
    def req(self, m, path, **kw):
        r = self.s.request(m, self.base + path, **kw)
        try: j = r.json()
        except Exception: j = r.text[:300]
        return r.status_code, j
    def get(self, p, **kw): return self.req("GET", p, **kw)
    def post(self, p, **kw): return self.req("POST", p, **kw)
    def patch(self, p, **kw): return self.req("PATCH", p, **kw)

def qa(role, port=8019): return C(port, QA[role], QA_PW)
def demo(role, port=8019): return C(port, *DEMO[role])
def show(label, obj, n=1500):
    print(f"--- {label}:", json.dumps(obj, ensure_ascii=False, default=str)[:n])
