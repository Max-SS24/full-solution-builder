# VA facilities: distance sorting, auto-discovery, review status

## What the user will see
- VA results sorted nearest first from the person's city or ZIP, each showing "X.X miles away".
- Each VA listing shows "Last verified on VA.gov: <date>" plus a badge: "Verified", "Page needs review" (VA.gov page missing last Sunday), or "Contact details changed, review" (address/phone changed on VA.gov since the last check).
- New VA locations published on VA.gov are added automatically during the Sunday check.

## How it works
1. **Coordinates**: add latitude/longitude to saved listings. VA.gov facility pages publish coordinates in their structured data; the Sunday re-read captures them (backfilled over the first Sunday's batches). Listings without coordinates yet fall back to a city/state geocode.
2. **Distance**: geocode the person's city or ZIP once per search (OpenStreetMap, already used), compute straight-line miles, sort VA results by it, and widen the search to neighboring states when within the requested distance. Distance shown on each card.
3. **Review flags**: new field recording why a listing needs review (page missing / contact changed) and when contact details last changed. Changed details are still updated from VA.gov but flagged for one week so staff can see it; admin Care options tab shows the reason too.
4. **Auto-discovery**: each Sunday, read VA.gov's official sitemap, compare facility and Vet Center page URLs to saved ones, and add any new pages whose structured data includes a valid address (with phone, coordinates, source link). New additions logged in the validation run details and visible in admin.
5. **Tests**: distance calculation/sort order, review-reason rules, and new-page detection from a sitemap sample.

## Technical details
- Migration: `care_options` add `lat`, `lon` (double precision, nullable), `review_reason` text nullable, `contact_changed_at` timestamptz nullable.
- `parseVaPage` extended to read `geo.latitude/longitude`; `validateVaBatch` sets review_reason/contact_changed_at.
- New `discoverVaFacilities()` in `care-options.server.ts`, run from the existing Sunday `{"part":"va"}` schedule (first batch call), inserting up to a capped number per run.
- `navigator.functions.ts`: haversine helper in `src/lib/care-rules.ts`, `distance_miles` on CareResult, VA results sorted ascending.
- `index.tsx`: distance text and review badge on VA cards.
- No VA API key used.
