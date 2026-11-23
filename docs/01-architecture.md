# 1. Full System Architecture

Last updated: 2026-11-20

## 1.1 Technology stack
- **Frontend / server:** TanStack Start v1 (React 19, Vite 7), TypeScript, Tailwind CSS v4.
- **Runtime:** Edge server functions (Cloudflare Workers-compatible).
- **Backend:** Lovable Cloud — PostgreSQL with row-level security (RLS), authentication, scheduled jobs.
- **Testing:** Vitest + Testing Library + axe-core (unit/integration), Python Playwright (live browser navigation).

```text
Browser (React UI) --> Server functions (createServerFn) --> Database (RLS)
                              |                                   ^
                              +--> AI provider / Lovable AI Gateway
                              +--> Live connectors (NPI, FindTreatment.gov)
Scheduled Sunday jobs --> /api/public/jobs/* (cron-auth guarded) --> Database
```

## 1.2 AI workflow
1. The person chats; the server function sends the conversation to the AI.
2. **Provider selection (server-only):** admin setting -> `AI_PROVIDER` secret -> Grok default. If the chosen provider has no key or fails, the built-in Lovable AI Gateway is used. Users never see or choose the model; keys stay in secrets.
3. **Intent classification:** each turn is `search`, `refine`, `question`, or `chat`. Chat/question turns return only a natural reply.
4. **Variable extraction:** need, location, in-person vs telehealth, VA vs community, individual vs group, VA application/registration stage, registered facility. Saved preferences fill only variables the chat left empty; the latest VA/community choice wins.
5. **Consent gate:** the server flags `readyToShow`; results are held until the person answers "Would you like to see your results now?"
6. **Fixed guidance:** VA care guide text and appointment-prep facts are fixed, VA.gov-sourced content — never AI-generated.
7. **Crisis detection:** danger signs surface 988 / 838255 / 911 alongside replies. If no location was given, no results are shown — only crisis contacts.
8. **Guests and AI:** signed-out visitors never reach the paid AI service. The chat uses the built-in guided extraction, and provider comparison uses a built-in word match (src/lib/basic-match.ts).
9. **Saved preferences vs. questionnaire:** saved account preferences win over questionnaire answers; the chat itself wins over both.

## 1.3 Database (key tables)
| Table | Purpose |
|-------|---------|
| `care_options` | ~1,600 VA facilities + community listings, status, hours, coordinates, check results |
| `data_sources` | Approved sources; admins toggle retrieval |
| `search_history` | Owner-only saved conversations (skipped in private mode) |
| `user_preferences` | Saved search preferences (one row per user) |
| `user_roles` | Admin roles (never on profiles) |
| `user_security`, `mfa_sessions`, `mfa_proofs`, recovery codes | Optional email MFA and hashed recovery codes |
| `prep_fact_checks` | Evidence checks for appointment-prep facts |
| `link_checks` | Weekly status of helpful/source links |
| `guidance_reports` | User reports of outdated guidance |
| `audit_log` | Trigger-written changes to sources and AI settings |
| `api_settings` | Admin AI provider choice |
| `guest_usage` | Hashed guest-token and network counters for the free-search limit |
| `community_check_history` | One admin-only row per community provider per week, incl. manual-validation state |
| `manual_validation_history` | Append-only record of each admin "mark validated" / "undo" with note and time |
| `a11y_audit_runs` | Sunday server audits and admin in-browser accessibility diagnostics, with acknowledgement; a newer passing check of the same kind automatically resolves older failures (`resolved_by_run`) |
| `appointment_guidance_reports` | User reports of outdated guidance (fixed fact IDs only) |

## 1.4 Data verification pipeline
- **Per search:** live connectors query enabled sources; results are upserted into `care_options`.
- **Distance:** straight-line miles from the city/ZIP center; ZIP-center estimates are labeled "about" and never invented.
- **Every Sunday (bounded batches):**
  - Care option re-validation — missed once -> needs review, twice -> removed.
  - VA directory refresh from VA.gov pages (contacts, hours); contact changes flagged 7 days.
  - VA discovery of newly listed facilities from VA.gov sitemaps.
  - Community source evidence + homepage checks (public DNS, manual redirects, foreign domains flagged). Website failures never change care status.
  - Helpful links and appointment-prep source page checks.
- **Appointment-prep facts:** shown only when the source page still contains its evidence phrases, checked within the last hour.
- **Reopened chats:** saved results are rechecked; unavailable options trigger a consent-based replacement offer.
- **Website check rules (weekly + deep recheck):** exact private-IP blocking, same-site HTTP->HTTPS hops allowed only if the final page is HTTPS, and 401/403/429-style firewall responses reported as "blocked (unconfirmed)", never as down. Each request first uses browser-like headers; on a dropped connection or a 520/525/526 error from the network in front of the server, it retries once with an honest checker name (`VA-Navigator-LinkCheck/1.0`). A 520 that persists is "blocked"; 525/526 (a certificate the checker cannot verify) is "unconfirmed — check in a browser"; only real site errors such as 404 or 500 count as down.
- **Deep recheck (admin):** 3 attempts, HEAD then GET, manual redirects, public-DNS check, page-content sanity check. "Recheck all failed" loops in batches of 25 until none remain.
- **Manual validation:** admins may mark a failed row validated through the `set_manual_validation` function (row lock + audit row in one step; admin identity and time taken from the server). This never changes care status or verification dates.
- **Dates shown to users:** "Last checked" (latest Sunday check) is shown separately from "Last confirmed" (last successful verification).
- **Clinic hours:** read from VA.gov structured data (openingHoursSpecification) during the Sunday VA batch, always with "Hours may not be accurate". Community listings have no hours.
- **Territories:** PR, GU, VI, AS, MP geocoded by name, with fixed official fallback contacts when no providers are found.

## 1.5 Scheduled jobs (Sunday)
| Job | What it does |
|-----|--------------|
| validate-care-options | Re-validates listings, VA directory pages, hours, community evidence and homepages in bounded batches |
| VA discovery | Adds newly listed VA facilities from VA.gov sitemaps |
| Link checks | Helpful links and appointment-prep source pages |
| a11y-audit (09:17 UTC) | Renders every public page inside the app (hosting refuses self-requests with 403) and checks language, title, skip link, `main#main`, one h1 and the display-preference script |

All job endpoints live under `/api/public/jobs/*` and reject calls without the cron secret.

## 1.6 Client-side features
- **Care Card PDF:** built in the browser with pdf-lib (no upload of personal data); guidance is rechecked before printing or downloading.
- **Route announcer:** after each page change, focus moves to the page's main heading and the new page title is announced.
- **Display preferences:** contrast, text size and motion are stored on the device and applied before first paint.
