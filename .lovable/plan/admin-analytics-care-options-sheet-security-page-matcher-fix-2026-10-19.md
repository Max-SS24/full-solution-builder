# Admin analytics, care options sheet, security page, matcher fix

## 1. Admin "Analytics" tab
Add tabs to the Admin page: Sources, AI, Admins, Audit log, and a new **Analytics** tab showing:
- Total registered users
- Active users (signed in during the last 30 days) vs inactive users
- New sign-ups in the last 7 and 30 days
- Total saved searches, plus searches in the last 7 days
- Users with saved preferences
- Top requested needs and locations, counted from saved searches (no names or emails shown)

Only admins can see these numbers, and only as totals.

## 2. Care options sheet (stored in the database)
- A new stored list of care options, sorted by **area (state, city)**, then **VA or community care**, then **insurance**.
- Each row: name, area, VA/community, insurance accepted, phone, website, verifying source, last validated date, and status (active, needs review, or removed).
- It is filled from the verified sources (FindTreatment.gov, NPI Registry) whenever a search finds new places. Saved options for that area are shown alongside live results, so the community-only and enabled-source rules still apply.
- Admins get a **Care options** tab to browse the sheet with filters for area, VA/community and insurance, and can export it as a CSV.
- **Weekly check every Sunday at 7:00 AM Eastern:** every saved option is checked again against its source. Options that still exist get a new "last validated" date. Options that can't be found are marked "needs review" and hidden from results. Each run is written to the audit log.

## 3. Data Storage & Security page
A new public page (linked in the header and footer) that explains in plain language:
- Where data lives: Lovable Cloud, built on Supabase (PostgreSQL)
- What is stored: login, preferences, search history, admin roles, audit log
- How it's protected: each person sees only their own data, password hashing, encryption, server-only secrets, and the change log that no one can edit
- Privacy controls: private search, clear history, delete account
- Wording: "designed with HIPAA and NIST principles in mind," with no certification claim

## 4. Fix "What matters most in a provider?"
- First, reproduce the problem with a real community search in Atlanta to confirm the cause. The likely cause is that real listings (long insurance lists or long descriptions) fail the matcher's size limits, which shows "Something went wrong."
- Then fix it: trim and limit the listing details before sending them instead of rejecting them, show a clear message when no listings are available, and check that matches show up from start to finish.

## Technical details
- Analytics: a security-definer `admin_analytics()` function that checks `has_role` and returns counts from `auth.users.last_sign_in_at`, `search_history`, and `user_preferences`.
- Table `care_options` (GRANT + RLS; anyone can read active rows from enabled sources; only admins and the service role can write), indexed on (state, city, va_vs_community). Insurance is stored as a text[] array.
- Upserts happen on the server after the live connectors run, keyed by source + external id.
- Weekly job: a server route at `/api/public/jobs/validate-care-options` guarded by `authenticateCronRequest`, with a managed HTTP schedule `0 11 * * 0` (UTC) that may run up to about 30 seconds late.
- Route: `src/routes/security.tsx` with its own head() metadata.
- Matcher: relax or trim the zod limits in `match.functions.ts` and the candidate mapping in `ProviderMatcher.tsx`.
- Add tests for the active/inactive cutoff and the weekly validation status rules.
