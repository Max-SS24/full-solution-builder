# Fix Status column in Care options tab

- Keep the status badge ("Active", "Needs review", "Removed") on one line so the word is never cut off or wrapped.
- Give the Status column a fixed minimum width so it fits the longest label, "Needs review".

## Technical details
- In `CareOptions` (src/routes/_authenticated/admin.tsx), add `whitespace-nowrap` and `min-w-[120px]` to the Status `<th>`/`<td>`, add `whitespace-nowrap inline-block` to the badge span, and widen the table's minimum width from 900px to 960px.
