<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Architecture rules
- Analytics use URL-held inclusive UTC dates and admin_analytics aggregates; snapshot totals stay current. Owner/MFA-checked recovery_activity() provides personal exports; CSVs match displayed data.
- Community homepages use source-supplied provider_website (separate from source_url); checks use public DNS and manual redirects and flag foreign domains without following.
- Sunday homepage checks run in bounded batches, storing URL-bound outcomes and attempt times in care_options; website failures never change care status or verification dates.
- Community Sunday batches persist care-source evidence and one admin-only history row per provider/week; NPI status or directory absence never proves availability or closure; alerts derive from persisted outcomes.
- Reopened-chat analytics use the injected Lovable event global with counts/decisions only (no care data); a replacement view needs half the listing in the viewport.
- AI provider is chosen server-side only via AI_PROVIDER env (grok|openai|gemini|openrouter) in src/lib/ai/providers.server.ts — users never see or pick the model.
- Care search reads care_resources joined to data_sources; only enabled sources are returned (RLS), so admins control retrieval by toggling sources.
- First signed-in user to open /admin becomes admin via claim_first_admin(); roles live in user_roles, never on profiles.
- Registered-user search preferences live in user_preferences (jsonb, one row per user) and are merged server-side only where the chat left a variable empty.
- Search history is saved client-side to search_history (owner-only RLS) after each answer; reopened via /?h=<id>.
- Reopened history is reconciled by an owner-scoped server fn against enabled sources and allowlisted official hosts; unconfirmed checks never refresh verification dates.
- Replacement offers need consent, exclude existing results, keep saved preferences, return only newly confirmed listings, and save as a separate conversation.
- Audit log rows are written only by the audit_changes() trigger on data_sources and api_settings; clients can read (admins) but never write.
- AI provider precedence: api_settings row (admin page) -> AI_PROVIDER secret -> grok; if the chosen provider has no key or fails, the built-in Lovable AI Gateway (src/lib/ai/gateway.server.ts) is used; keys always remain secrets.
- Live data connectors (src/lib/connectors.server.ts) run per request for data_sources rows with a non-null connector that are enabled; listings are never copied from sites that forbid it.
- Account erasure runs in src/lib/privacy.functions.ts (auth-checked server fn, admin client only for auth user deletion); private-search mode skips search_history inserts client-side.
- Live search results are upserted into care_options (server-side admin client) and merged back into later searches by state; only active rows of enabled sources are readable.
- care_options are re-validated weekly by a managed HTTP schedule calling /api/public/jobs/validate-care-options (cron-auth guarded); status rules live in src/lib/care-rules.ts (miss once → needs_review, twice → removed).
- Admin analytics come only from the admin_analytics() security-definer RPC (has_role checked inside, totals only).
- Sign-up password rules live in src/lib/password-rules.ts (sign-in unchanged); DB access is parameterized client/RPC calls only — never build raw SQL from user input.
- VA care guide text is fixed, VA.gov-verified content in src/lib/va-guide.ts (never AI-generated); shown when va_vs_community === 'va'. Admin password resets are logged via log_password_reset() RPC before the email is sent.
- VA facilities come keyless from VA.gov pages (~1,600 rows in care_options); Sunday validate-va-directory (40-row batches) refreshes contacts (contact_changed_at flags 7 days) and va-discover adds new pages from sitemaps; results sorted by distance (care-rules.ts); Lighthouse connector dormant without VA_API_KEY.
- link_checks table is filled by the Sunday validate-care-options job (link-checks.server.ts); /helpful-links reads it to show each link's verified date.
- Supported areas (50 states, DC, PR, GU, VI, AS, MP) live in src/lib/us-areas.ts; territories are geocoded by name because OpenStreetMap treats them as separate countries.

- Territory fallback next steps (fixed, official contacts) live in src/lib/territory-guidance.ts and show only when a territory search finds no providers.- Results are held client-side until the person confirms ("Would you like to see your results now?"); the server only flags readyToShow. The VA guide is filtered by stage via guideFor() in src/lib/va-guide.ts; the latest VA/community choice in the chat overrides earlier ones; optional /questionnaire answers live in sessionStorage (van_quiz) and are sent as prefs.
- Navigator AI returns intent (search|refine|question|chat); chat/question turns get the AI reply only, with no checklist text, guide notes or results prompt appended, so conversation stays natural.
- Optional email sign-in codes: user_security.email_mfa per user; a password sign-in records an mfa_proofs row, the emailed-code session (JWT amr otp) within 10 minutes clears that session_id in mfa_sessions; has_mfa_cleared() gates personal-data RLS and has_role, so locked sessions are blocked server-side, not just in the UI.
- In-person searches with a location show straight-line miles from the area center (wantsDistance/withDistances in care-rules.ts); listings without directory coordinates get a ZIP-center estimate saved with geo_estimated, never an invented distance.
- MFA recovery codes: hashed only, service_role table; redeem needs password session + fresh proof, rate limited, clears via mfa_sessions.
