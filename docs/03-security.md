# 3. Application Data Security

Last updated: 2026-11-12

## 3.1 Access control
- **Row-level security** on every table; personal data (history, preferences, security records) is owner-only.
- **Roles** live in `user_roles` and are checked by the server-side `has_role()` function — never from user-editable data.
- **First admin:** the first signed-in user to open `/admin` becomes admin via `claim_first_admin()`.
- **Audit log** rows are written only by database triggers; clients can read (admins) but never write.

## 3.2 Authentication
- Email + password with enforced sign-up password rules.
- **Optional email sign-in codes (MFA):** a code session within 10 minutes clears the sign-in; locked sessions are blocked server-side (`has_mfa_cleared()`), not just in the UI.
- **Recovery codes:** stored hashed only, rate limited, revocable and regenerable, with usage history.
- Admin-initiated password resets are logged.

## 3.3 Privacy
- **Private search mode** skips saving search history.
- **Personal export** of recovery activity (owner + MFA checked).
- **Account erasure** deletes profile, preferences, history, MFA sessions/proofs, and recovery records, then the login itself.
- Analytics are totals/counts only; no care details are sent to event tracking.
- Guidance reports ask users not to include names, contact details, or medical information.

## 3.4 Secrets and data handling
- API keys stay in server secrets; never in source code or the browser.
- All database access uses parameterized client/RPC calls — no raw SQL from user input.
- Public scheduled-job endpoints are protected by a cron secret.
- Listings are never copied from sites that forbid it.
