# Sign-in code: resend, countdown, and recovery codes

## 1. Request a new code (improve existing resend)
- The screen already has a "Resend code" link with a 60-second wait. Make it clearer:
  - Add a "Didn't get the email?" line with spam-folder reminder and the resend button.
  - After resending, show "New code sent at 7:42 PM — older codes no longer work".
  - Limit to 5 resends per sign-in; after that, point to the recovery option below.

## 2. Show how long the code stays valid
- A live countdown on the screen: "Code valid for 9:32". It restarts on each resend.
- At 0:00: "This code has expired — send a new one", and Verify is turned off until a new one is sent.
- Countdown also covers the 10-minute window to finish sign-in after the password.

## 3. Recovery codes for lost email access
- When someone turns on sign-in codes (sign-up or account page), they get 10 one-time recovery codes once, with Copy and Download buttons and a "Save these somewhere safe" warning.
- Account page: "Make new recovery codes" (needs a fresh emailed code first; old codes stop working) and a count of codes left.
- Verification screen: "Lost access to your email? Use a recovery code" — enter one code instead of the emailed code. Each code works once.
- Protection: 5 wrong tries locks recovery for 15 minutes; every use is recorded and an email notice is sent saying a recovery code was used.
- People who already have codes on will see a prompt on the account page to create their recovery codes.

## Technical details
- New table `mfa_recovery_codes` (user_id, code_hash, used_at), service_role only; codes stored as SHA-256 hashes with a per-user salt, never plain.
- `mfa_recovery_attempts` for rate limiting; server fns in `mfa.functions.ts`: `createRecoveryCodes` (requires recentCode), `recoveryStatus`, `useRecoveryCode` — on success inserts the current session_id into `mfa_sessions`, same as `completeMfa`, so `has_mfa_cleared()` and RLS stay unchanged.
- Constants in `mfa-rules.ts`: CODE_VALID_MS (10 min), MAX_RESENDS, RECOVERY_CODE_COUNT, lockout rules; unit tests for expiry, resend limits, one-time use and lockout.
- AGENTS.md rule for recovery codes.
