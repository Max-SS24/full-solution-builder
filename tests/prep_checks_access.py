"""Regression test: who can read appointment prep checks.

Visitors may read checks only for official VA.gov pages; admins may read all.
Runs the table's real stored read rule (auth.uid() swapped for the same JWT claim lookup) against temporary rows inside a
transaction that is always rolled back, so nothing is saved.
Run: python3 tests/prep_checks_access.py
"""
import subprocess, sys

ROWS = {
    "zz_test_va": "https://www.va.gov/health-care/test",
    "zz_test_va_root": "https://va.gov/test",
    "zz_test_other": "https://example.com/test",
    "zz_test_spoof": "https://va.gov.evil.example/test",
    "zz_test_http": "http://www.va.gov/test",
}
VISITOR_EXPECTED = "zz_test_va,zz_test_va_root"
ADMIN_EXPECTED = ",".join(sorted(ROWS))

values = ",".join(f"('{k}','{v}',true)" for k, v in ROWS.items())
script = f"""
\\set ON_ERROR_STOP 1
begin;
select 'rls', relrowsecurity from pg_class where oid = 'public.prep_fact_checks'::regclass;
select 'select_policies', count(*) from pg_policies where tablename = 'prep_fact_checks' and cmd in ('SELECT','ALL') and permissive = 'PERMISSIVE';
select replace(qual, 'auth.uid()', $$(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub')::uuid$$) as q from pg_policies where tablename = 'prep_fact_checks' and cmd = 'SELECT' \\gset
insert into public.prep_fact_checks(fact_id, source_url, ok) values {values};
select set_config('request.jwt.claims', '{{}}', true);
select 'visitor', string_agg(fact_id, ',' order by fact_id) from public.prep_fact_checks where fact_id like 'zz\\_test\\_%' and (:q);
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000000', 'role', 'authenticated')::text, true);
select 'non_admin', string_agg(fact_id, ',' order by fact_id) from public.prep_fact_checks where fact_id like 'zz\\_test\\_%' and (:q);
select set_config('request.jwt.claims', json_build_object('sub', (select user_id from public.user_roles where role = 'admin' limit 1), 'role', 'authenticated')::text, true);
select 'admin', string_agg(fact_id, ',' order by fact_id) from public.prep_fact_checks where fact_id like 'zz\\_test\\_%' and (:q);
rollback;
"""
out = subprocess.run(["psql", "-XAtq", "-F", "|"], input=script, capture_output=True, text=True)
if out.returncode:
    sys.exit(out.stderr)
got = dict(l.split("|", 1) for l in out.stdout.splitlines() if "|" in l)
expect = {"rls": "t", "select_policies": "1", "visitor": VISITOR_EXPECTED,
          "non_admin": VISITOR_EXPECTED, "admin": ADMIN_EXPECTED}
fails = [f"{k}: got {got.get(k)!r}, expected {v!r}" for k, v in expect.items() if got.get(k) != v]
print("\n".join(fails) or "PASS: visitors and non-admins see VA.gov checks only; admins see all")
sys.exit(1 if fails else 0)
