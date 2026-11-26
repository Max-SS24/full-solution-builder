# 2. Application Capabilities

Last updated: 2026-11-20

## 2.1 For veterans
- **Conversational care search** for mental-health care across all 50 states, DC, and 5 territories.
- **Filters:** need, in-person vs telehealth, VA vs community, individual vs group, distance radius.
- **VA facility results** sorted by distance, with address, phone, hours (with accuracy notice), VA.gov link, last-verified date, and review badges.
- **Community results** with provider homepage shown separately from the verification source.
- **"Your VA facility" card** for the registered facility, correctable in chat.
- **Stage-based VA guide** (not applied / applied / registered), including how to find your facility.
- **Optional questionnaire** (`/questionnaire`) to pre-fill answers; editable later on the account page.
- **Appointment prep** (`/appointment-prep`): verified VA.gov facts presented as "what we found and what it suggests," with sources, review date, and a disclaimer. Each item has **Report an issue**.
- **Appointment prep checks:** each item shows when it was last checked, links to its VA.gov source, and has a **Check if this is current** button (limited to once per 30 seconds).
- **Care Card:** one-page summary of matched facilities, contacts, hours and verified next steps — **Print** or **Download PDF**, also available from the Appointment prep page.
- **Guest access:** no account needed. Guests get the built-in guided search and simple word matching (the AI assistant is for signed-in accounts), with 5 free result sets per 24 hours with a visible counter, a gentle notice at the 4th, and the reset time in their own time zone. Crisis help never counts.
- **Coverage area:** searches cover the 50 U.S. states, Washington, D.C., and the U.S. territories (Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa, and the Northern Mariana Islands). When someone names a place outside that area, the chat says so plainly, lists what is covered, and asks for a U.S. city, state or ZIP — no listings are invented and no free search is used.
- **Download my data:** account owners can download all their saved data as a file.
- **Works on every screen:** phones (incl. foldables), tablets, laptops and desktops, 320px to 1920px.
- **Helpful links** (`/helpful-links`) with weekly verification dates.
- **Accounts:** saved preferences, search history, private search mode, optional email sign-in codes, recovery codes, data export, and account deletion.
- **Crisis support** always one tap away.

## 2.2 For administrators (`/admin`)
- Enable/disable approved data sources.
- Choose AI provider.
- Weekly check results, alerts, and website-check trends.
- Guidance report inbox (mark reviewed / reopen).
- Analytics (users, searches, recovery events) with UTC date ranges and matching CSV exports.
- Audit log and recovery-code dashboard.
- **Weekly checks:** filter failed providers by failure reason, recheck status and last-verified date.
- **Deep recheck** per row, or **Recheck all failed sources**.
- **Auto-resolve:** a failed result clears itself ("Resolved automatically") when a newer check of that provider — Sunday, deep recheck or a live search — passes every part that failed.
- **Certificate rule:** a provider whose website security certificate can't be verified is left out of search results, reopened searches and replacements until a later check verifies it.
- **Mark validated / Undo** with a note, plus an audit history of who did it and when.
- **Accessibility health:** Sunday page audit results, an in-browser diagnostic that tries every contrast/text-size combination on all 13 pages, and an alert banner plus Admin badge until failures are marked reviewed or a newer check of the same kind passes every page that failed.

## 2.3 Known limitations
- Community clinic hours are not available from a reliable official source.
- Recovery-code-used email alerts wait on a connected sender domain.
- Distances are straight-line, not driving distance.
- Accessibility alerts and guidance reports appear in-app only (no email yet).
- The guest limit (5 result sets) is a fixed value that can be tuned.

### Registered facility by place and self-entered Care Card details
- Saying a registered facility is "near Decatur, GA" (or a ZIP) shows up to four nearest VA locations with addresses and miles; the person picks one or says "none of these". Nothing is saved without their choice.
- When Care Card details can't be confirmed, people can add facility, address, phone, appointment time and notes themselves. These stay on their device and are marked "Entered by you — not verified by VA Navigator" on the card, print and PDF.
- Admin Care options now loads every listing (not just the first 1,000) and shows totals by status and VA/community that match Analytics.
