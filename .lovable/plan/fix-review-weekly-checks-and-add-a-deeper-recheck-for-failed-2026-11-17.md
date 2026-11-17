# Fix "Review weekly checks" and add a deeper recheck for failed checks

## 1. Make "Review weekly checks" work
Right now the alert button only switches to the Weekly checks tab. If you're already on that tab, nothing happens, and the alert sits above the tabs, so the problem list may be off screen.

The fix: clicking the button opens the Weekly checks tab, picks the latest week, shows the **Issues** filter, then scrolls to the list of failed checks and moves keyboard focus there. Screen readers will announce how many issues are shown.

## 2. Add "Recheck failed checks" (deeper validation)
- A **Recheck failed** button on the Weekly checks tab (for the selected week). Each failed row also gets its own **Recheck** button.
- A check counts as failed if the page was unavailable, it redirected unexpectedly, we couldn't check it, or the care listing needs confirmation.
- The deeper check does more than the normal Sunday check:
  - **Several tries with longer waits.** Up to 3 attempts, with longer time limits and a pause between them, so short outages aren't counted as failures.
  - **Two ways to load the page.** It first does a quick header check, then loads the full page, because some sites refuse quick checks.
  - **Follows redirects one step at a time.** Each step is checked against public internet addresses, as today. A redirect counts as fine if it stays on the provider's own site or switches between www and non-www, or from http to https. It is still flagged if it lands on a different website.
  - **Checks the page content.** The page must actually be a web page with content, not an empty page or an error page that wrongly reports success.
  - **Checks the official listing again.** The provider's care listing is rechecked against the official directory, in the same way as the Sunday batch.
- **What you see afterwards.** Each row shows the new result, "Rechecked (deep)", the time, and a short reason, for example "Recovered on attempt 2" or "Still unavailable after 3 tries". The counts and the chart refresh.
- **Limits.** Only admins can run it. Each run handles at most 25 providers, with a progress note. If there are more than 25, you click again to continue.
- **Existing rules still apply.** A website failure never changes a provider's care status or its verification dates. The deep recheck updates only the website-check fields and that week's history row, and marks the row as deep-rechecked. The audit trail keeps the original Sunday result.

## Technical details
- `WeeklyChecks.tsx`: lift `filter` and `selectedWeek` into admin state, or take a `focusIssues` signal, so `WeeklyCheckAlert.onOpen` sets the tab, resets the filter to issues, then scrolls and focuses the heading with a ref in a `useEffect`.
- New `src/lib/deep-check.server.ts`: `deepCheckHomepage(url)` wraps `checkHomepage` with retries and backoff, a HEAD then GET fallback, a content-type and body-size sanity check, and same-site redirect normalisation. Unit tests use a mocked fetcher.
- New admin server fn `recheckFailed({ week, ids? })` in `src/lib/weekly-recheck.functions.ts`, using `requireSupabaseAuth`, then `has_role` admin through `context.supabase`, then the admin client imported inside the handler. It updates the `care_options` homepage fields and `community_check_history`, and reuses `checkCommunityCare`.
- Migration: add `deep_checked_at timestamptz` and `deep_reason text` to `community_check_history`.
- Tests: retry recovery, a foreign redirect still flagged, a website failure leaving care status untouched, and non-admins rejected.
