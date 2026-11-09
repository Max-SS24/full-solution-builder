# Distance for in-person care + optional email sign-in codes

## 1. Estimated distance on in-person results
When the person has a location set and prefers **in person** care, every listing shows "about X miles away", measured from the center of their city (or ZIP if they typed one).

- VA listings already show distance; this extends it to community listings.
- FindTreatment listings: use the map position the directory already supplies and save it with the listing.
- Provider-registry listings (no map position supplied): estimate from the listing's ZIP code center, saved once so it isn't looked up again. Labeled "est." because it's approximate.
- If no position can be found, the listing simply shows no distance (never a made-up number).
- In-person community results are sorted nearest first; telehealth/phone results are unchanged and show no distance.
- Reopened chats keep showing the saved distance.

## 2. Optional email code at sign-in (two-step login)
- **Sign-up form:** checkbox "Also email me a sign-in code each time I log in" (off by default).
- **Account page:** a "Sign-in security" toggle to turn it on or off. Turning it off requires entering a code sent to your email.
- **Login with it on:** after the correct password, a screen asks for a 6-digit code emailed to you. Code expires in 10 minutes, 5 wrong tries max, "Resend code" with a short wait.
- Until the code is entered, the account pages, saved history and admin page stay locked, both on screen and on the server.
- Google sign-in follows the same rule when the setting is on.

## Technical details
- Migration: `care_options.distance_basis` not needed; reuse `lat/lon`, add `geo_estimated boolean`. FindTreatment connector maps `latitude/longitude`; NPI rows geocoded by postal code via `geocodeZip`, cached in `care_options`.
- navigator.functions: when `care_format === 'in-person'` and an origin exists, compute `milesBetween` for all results (live + stored) and `sortByDistance` community results. Card shows "est." when `geo_estimated`.
- Tables (with grants + RLS): `user_security (user_id pk, email_mfa boolean)` owner read/update; `mfa_challenges (user_id, session_id, code_hash, expires_at, attempts, verified_at)` no client access.
- Server fns (requireSupabaseAuth): `startEmailMfa` (hash code, email it via Lovable transactional email), `verifyEmailMfa`, `mfaStatus`. Verification is bound to the JWT `session_id`, so a new session needs a new code.
- `has_mfa_cleared()` SQL helper used in RLS on search_history, user_preferences and admin reads; `_authenticated` pages redirect to `/auth/verify` when not cleared.
- Requires setting up an email sending domain if one isn't configured yet.
- Tests: distance only added for in-person + location; code expiry, attempt limit, session binding.
