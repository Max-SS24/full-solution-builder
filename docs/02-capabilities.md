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
- **Guest access:** no account needed. Guests get 5 free result sets per 24 hours with a visible counter, a gentle notice at the 4th, and the reset time in their own time zone. Crisis help never counts.
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
- **Mark validated / Undo** with a note, plus an audit history of who did it and when.
- **Accessibility health:** Sunday page audit results, an in-browser diagnostic that tries every contrast/text-size combination on all 13 pages, and an alert banner plus Admin badge until failures are marked reviewed.

## 2.3 Known limitations
- Community clinic hours are not available from a reliable official source.
- Recovery-code-used email alerts wait on a connected sender domain.
- Distances are straight-line, not driving distance.
- Accessibility alerts and guidance reports appear in-app only (no email yet).
- Guest limits (5 results; 40 AI replies) are fixed values that can be tuned.
