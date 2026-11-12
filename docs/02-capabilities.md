# 2. Application Capabilities

Last updated: 2026-11-12

## 2.1 For veterans
- **Conversational care search** for mental-health care across all 50 states, DC, and 5 territories.
- **Filters:** need, in-person vs telehealth, VA vs community, individual vs group, distance radius.
- **VA facility results** sorted by distance, with address, phone, hours (with accuracy notice), VA.gov link, last-verified date, and review badges.
- **Community results** with provider homepage shown separately from the verification source.
- **"Your VA facility" card** for the registered facility, correctable in chat.
- **Stage-based VA guide** (not applied / applied / registered), including how to find your facility.
- **Optional questionnaire** (`/questionnaire`) to pre-fill answers; editable later on the account page.
- **Appointment prep** (`/appointment-prep`): verified VA.gov facts presented as "what we found and what it suggests," with sources, review date, and a disclaimer. Each item has **Report an issue**.
- **Printable Care Card:** one-page summary (print or PDF) of matched facilities, contacts, hours, and verified next steps.
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

## 2.3 Known limitations
- Community clinic hours are not available from a reliable official source.
- Recovery-code-used email alerts wait on a connected sender domain.
- Distances are straight-line, not driving distance.
