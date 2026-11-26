# Facility matching, accurate admin counts, and fillable Care Card

## 1. Find a registered VA facility by place ("near Decatur, GA")
Today the chat only matches a registered facility when the person's words appear in the facility's name, so "near Decatur, GA" matches nothing.

- Detect when the facility answer is a place (city/state or ZIP, e.g. "near Decatur, GA", "the clinic in 30033").
- Look up VA facilities and Vet Centers closest to that place (up to 4, with miles and address).
- Ask: "I found these VA locations near Decatur, GA. Which one is yours?" as a numbered list, plus "None of these".
- The person can answer with a number or the name; that facility is saved and the "Your VA facility" card fills in (address, phone, hours, VA.gov link).
- "None of these" asks for the facility name or another city; nothing is guessed or saved without confirmation.
- Same flow works for corrections ("that's not my clinic, it's near Decatur").

## 2. Admin numbers match Analytics
The Care options list asks for 2,000 rows, but the database returns at most 1,000 per request, so the admin list stops at 1,000 while Analytics counts all 2,268.

- Load care options in pages until all rows are in, and show the real total from a count.
- Label the counts clearly: total, active, needs review, removed, and VA vs community, so they line up with the Analytics totals.
- Check other admin lists for the same 1,000-row cap and fix any found.

## 3. Care Card when steps can't be verified
- When an appointment step or facility detail can't be confirmed, show it as "Not confirmed" (as now) and offer "Add this myself".
- A short form lets the person enter their facility, phone, appointment date/time, address, and notes.
- Their entries print and download on the Care Card, clearly marked "Entered by you — not verified by VA Navigator".
- Entries stay on their device only (not saved to the database) and can be edited or cleared.
- Verified VA.gov facts are never overwritten by typed info.

## Testing
- Tests: "near Decatur, GA" returns nearby VA options and requires confirmation; number/name pick saves the facility; "none" saves nothing.
- Test: admin loader returns more than 1,000 rows and totals match.
- Test: user-entered Care Card fields appear labeled as unverified in print and PDF.
- Live browser check of the Decatur flow, admin totals, and Care Card download.

## Technical details
- `navigator.functions.ts`: new `facility_candidates` state; geocode location via existing geocoder, rank VA rows with `withDistances`/`sortByDistance`; resolve choice by index or `facilityMatches`.
- `admin.tsx` CareOptions: paged `.range()` fetch plus `count: "exact", head: true` totals.
- `CareCard.tsx` / `care-card-pdf.ts`: `userEntered` fields from sessionStorage, separate "unverified" styling.
- Update docs capabilities section.
