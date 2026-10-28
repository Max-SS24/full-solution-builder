# Admin password reset, remove long dashes, VA care guide

## 1. Send a password reset link (Admin page)
- A new "Password reset" area in the Admins tab: type a user's email and click "Send reset link".
- The user gets an email with a link to a new "Set a new password" page. That page uses the same strong-password checklist as Sign up.
- Every reset an admin sends is written to the audit log (who sent it, to which email, and when). Admins never see or set the password.
- Users also get a "Forgot password?" link on the Sign in page.

## 2. Remove all long dashes (—)
- Replace every long dash in the text people see (chat replies, crisis messages, page text, page titles, admin page, emails) with commas, colons, periods or plain hyphens, whichever reads naturally.
- Code notes that visitors never see are left alone.

## 3. VA care route: step-by-step guide (top priority)
When someone says they want care through the VA, the reply shows:
- **A step-by-step guide**, with every step linked to the official VA.gov page it comes from:
  1. Check eligibility and apply for VA health care (VA Form 10-10EZ, online, by phone at 877-222-8387, or in person).
  2. Get same-day mental health help at any VA medical center or Vet Center, even before you're enrolled.
  3. Choose a primary care provider or ask for a mental health appointment (online scheduling or calling the facility).
  4. Vet Centers: free readjustment counseling, with no enrollment needed for eligible veterans.
  5. Ask about VA Community Care if wait times or distance qualify you.
  6. Get help from a VA-accredited Veterans Service Officer (VSO).
  7. Crisis line, available any time: 988, then press 1.
- **VA care options near them**, from the enabled VA sources, with phone numbers and VA.gov facility links. If none are found, they get a link to the official VA.gov facility locator for their area.
- A "Source: VA.gov, checked <date>" line under the guide.

Verification: before building, I'll read each VA.gov page live and confirm every step, phone number and link. Anything I can't confirm on VA.gov is left out. The guide's text is written in fixed wording, not made up by the AI, so it can't change from one answer to the next.

## Technical details
- Password reset: auth-checked `sendPasswordReset` server function. It checks the caller's admin role through `has_role`, then calls `resetPasswordForEmail(email, { redirectTo: origin + "/reset-password" })` and writes an audit row through a new security-definer `log_admin_action` RPC. New public route `src/routes/reset-password.tsx` that handles `type=recovery`, calls `updateUser({ password })` and reuses `checkPassword`.
- The steps live in `src/lib/va-guide.ts` (steps, official URLs, and the date each was checked). `navigate()` returns a `vaGuide` flag when `va_vs_community === "va"`, and `index.tsx` shows the guide card above the results. VA results come from the enabled VA data sources, or a VA.gov locator link when there are none.
- Find long dashes with `rg "—"`, replace them in user-facing strings, and update tests that match crisis wording.
- Add tests: a non-admin can't send resets, and the VA guide shows only when VA is preferred and every step has a va.gov URL.
