# Regression checks for the admin-status access change

Three checks, each a standalone script in `tests/` like the existing appointment-prep access test. Each runs inside a database transaction that always rolls back, so nothing is saved.

## 1. Admin-status lookups (`tests/admin_role_access.py`)
Calls the real admin-status check while posing as different people:
- Visitor (no sign-in) asking about an admin: answers "no".
- Signed-in non-admin asking about themselves: "no"; asking about an admin: "no" (cannot probe others).
- Admin asking about themselves: "yes"; asking about another admin: "yes"; asking about a non-admin: "no".
- Backend (service role, no person): gets the true answer for any account.
- An empty account ID always answers "no".
- Confirms visitors and signed-in people still have permission to run the check, which the access rules need.

## 2. Public search and link checks still work for visitors (`tests/public_read_access.py`)
Posing as a visitor, evaluates the live read rules and confirms:
- Active listings from enabled sources are readable (count > 0); removed listings and listings from disabled sources are not.
- Enabled data sources are readable; disabled ones are not.
- Official helpful-link checks are readable; a temporary non-official link row is hidden.
- Appointment prep checks for VA.gov pages remain readable.
Also loads the public home page and the Helpful links page in a browser while signed out, and confirms results/verified dates show with no access errors.

## 3. Admin "already an admin" check (`tests/admin_grant_check.py`)
Posing as an existing admin, asks to grant admin to an account that is already an admin and expects "already" (no new role row, no audit entry). Also confirms a non-admin is refused ("Forbidden").
Then a browser pass signed in as the admin: open the admin page, enter that admin's email in Add admin, and confirm the "already an admin" message appears and the admin list is unchanged.

## Technical details
- Identity is set via `request.jwt.claims` (`sub`, `role`); has_role/grant_admin are security definer, so auth.uid()/auth.role() resolve inside them.
- Test admin is chosen from user_roles; if that admin has email codes on, the script also inserts a matching mfa_sessions row (rolled back) so "cleared" is exercised.
- Browser scripts reuse the managed-session pattern in `tests/browser_navigation.py`.
- Add a short "How to run" note to docs/03-security.md.
