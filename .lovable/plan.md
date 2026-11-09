# Verify export preview matches the downloaded CSV

## Goal
Confirm that, for a chosen From/To week range, the on-page export preview and the downloaded CSV show the same trend totals and the same provider results.

## Steps
1. Move the range filtering and CSV-building logic out of the weekly checks panel into a small shared helper, so the preview and the download both use exactly the same data (no visual change).
2. Add automated tests for that helper using sample weekly checks across several weeks:
   - Trend rows in the CSV equal the preview trend rows (week, providers checked, unavailable, redirects, could not check).
   - CSV result rows equal the full set of preview results (the preview shows the first 10; the CSV contains all of them, same order).
   - Weeks outside the range are excluded; a reversed range gives the same output.
   - Values starting with = + - @ are neutralized in the CSV.
3. Run the tests.
4. Open the Admin page signed in as an admin, pick a range, read the preview, click "Download this CSV", and compare the downloaded file's trend totals and result count with the preview. Report what matched or didn't.

## Technical details
- New `src/lib/weekly-export.ts` with `rangeData(all, from, to)` and `buildCsv(...)`; `WeeklyChecks.tsx` imports both.
- New `src/lib/weekly-export.test.ts` (vitest).
- Browser check via Playwright with download capture; depends on weekly check history existing in the selected range.
