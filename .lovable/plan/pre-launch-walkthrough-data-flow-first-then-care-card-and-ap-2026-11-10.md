# Pre-launch walkthrough (data flow first), then Care Card and appointment prep review

## Part 1 — Pre-launch checklist walkthrough (priority: data flow)

Go page by page and trace where each piece of information comes from, where it is stored, who can see it, and when it is deleted. Each finding goes into a written report with a severity (must fix before launch / should fix / fine). Must-fix items are fixed and retested in this part.

### 1. Data flow trace (highest priority)
For each flow, confirm what is sent, stored and shown, with real signed-in and signed-out runs:
- **Chat search**: what the chat sends to the server, what the AI sees, what goes into saved search history, and that private-search mode really saves nothing.
- **Questionnaire and saved preferences**: device-only answers vs. account-saved answers; that removing one or all preferences actually deletes them.
- **Results**: only listings from turned-on sources appear; removed or needs-review listings are handled correctly; distances and hours are never invented.
- **Reopened history**: link checks and replacement offers save as a separate conversation and never change verification dates without proof.
- **Accounts and security**: sign-up, sign-in codes, recovery codes, password reset, and account deletion remove every personal record.
- **Admin**: analytics show totals only, exports match what is on screen, the audit log cannot be edited.
- **Sunday checks**: each scheduled job is running, guarded, and its last results are recent.

Method: read the database access rules for every table holding personal data, run the security scan, query real row counts and recent job runs, and run end-to-end browser checks as a real signed-in user.

### 2. Copy and disclaimers
- Every guidance screen carries the "sourced from VA documentation / not liable for approval or denial" notice.
- Crisis line, hours notice, and estimated-distance labels are present and consistent.
- No placeholder or made-up contact details anywhere.

### 3. Launch readiness items
- Page titles and descriptions for sharing.
- Stale open items in the task list (Grok key, VA API key) closed or marked as not needed, matching the keyless approach.
- Items that stay open and why: branded email (waiting on a domain) and real screen-reader testing on a Mac/iPhone/Windows device.

Output: a short report shared in chat, plus fixes for every must-fix item and tests for any rule that changes.

## Part 2 — Care Card and appointment prep review

Done after Part 1 is approved and finished:
- Print the Care Card in letter and A4 sizes, desktop and phone, and fix clipping, page breaks and small text.
- Check the card in high-contrast and large-text modes.
- Confirm every appointment-prep fact still links to its VA.gov source, shows its latest check date, and hides anything that failed verification.
- Tidy wording so it keeps the "here is what we found and what it suggests" tone.

## Technical details
- Data review: RLS/grants per table, security scan + linter, row/job queries via read-only SQL, managed schedule history.
- E2E: Playwright with a minted session against localhost; private-search, erasure and preference removal verified by reading the database afterward.
- Print: Playwright `page.pdf()` at Letter/A4 and mobile emulation, screenshots reviewed.
- Any changed rule gets a small vitest next to existing tests; full suite rerun at the end.
