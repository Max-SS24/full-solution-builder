# 1. Full System Architecture

Last updated: 2026-11-12

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
7. **Crisis detection:** danger signs surface 988 / 838255 / 911 alongside replies.

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
- **Territories:** PR, GU, VI, AS, MP geocoded by name, with fixed official fallback contacts when no providers are found.
