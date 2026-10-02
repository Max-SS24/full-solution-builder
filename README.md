# VA Navigator — IT Capstone

VA Navigator helps Veterans find mental-health care from **approved** VA and community sources through a friendly chat. It is a navigation tool, **not a clinician**, and never diagnoses.

> In crisis? Call **988, press 1**, or text **838255** (Veterans Crisis Line).

## Features
- Conversational search that gathers need, location (default Atlanta, GA), format, VA vs community, and one-on-one vs group
- Hard filter: community-only seekers never see VA options
- Crisis detection with an always-visible crisis banner
- Accounts with saved preferences and private search history
- Admin panel: toggle approved data sources, choose AI provider, view audit log
- Swappable AI providers (Grok default, OpenAI, Gemini) — backend only

## Tech stack
TanStack Start (React 19, Vite 7) · Tailwind CSS v4 · Lovable Cloud (Postgres, auth, row-level security) · TypeScript

## Repository layout
```text
src/
  routes/                 Pages (index = chat, auth, _authenticated/admin|account|history)
  components/             Shared UI (SiteHeader, crisis bar, ui/)
  hooks/                  useAccount and helpers
  lib/navigator.functions.ts   Search + matching server function
  lib/ai/providers.server.ts   AI provider registry (reads API keys from secrets)
  integrations/supabase/  Generated backend client (do not edit)
supabase/                 Backend config
drizzle/                  Schema reference and migrations
public/                   Static assets
docs/                     Capstone documentation
```

## Run locally
```bash
npm install
npm run dev        # http://localhost:8080
```
Copy `.env.example` values as needed. API keys go in project secrets / environment variables — never in source files.

## Approved data sources
VA Facilities API · VA Community Care Network · VA Mental Health Services · FindTreatment.gov (SAMHSA) · Psychology Today Veterans Directory · State Licensing Boards · Veteran nonprofit & community organizations.

Sample care listings in the database are illustrative, not verified real data.

## Admin
The first signed-in user to open `/admin` becomes the admin. Every change to sources or AI settings is recorded in the audit log.
