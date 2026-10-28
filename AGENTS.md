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
- AI provider is chosen server-side only via AI_PROVIDER env (grok|openai|gemini|openrouter) in src/lib/ai/providers.server.ts — users never see or pick the model.
- Care search reads care_resources joined to data_sources; only enabled sources are returned (RLS), so admins control retrieval by toggling sources.
- First signed-in user to open /admin becomes admin via claim_first_admin(); roles live in user_roles, never on profiles.
- Registered-user search preferences live in user_preferences (jsonb, one row per user) and are merged server-side only where the chat left a variable empty.
- Search history is saved client-side to search_history (owner-only RLS) after each answer; reopened via /?h=<id>.
- Audit log rows are written only by the audit_changes() trigger on data_sources and api_settings; clients can read (admins) but never write.
- AI provider precedence: api_settings row (admin page) -> AI_PROVIDER secret -> grok; if the chosen provider has no key or fails, the built-in Lovable AI Gateway (src/lib/ai/gateway.server.ts) is used; keys always remain secrets.
- Live data connectors (src/lib/connectors.server.ts) run per request for data_sources rows with a non-null connector that are enabled; listings are never copied from sites that forbid it.
- Account erasure runs in src/lib/privacy.functions.ts (auth-checked server fn, admin client only for auth user deletion); private-search mode skips search_history inserts client-side.
- Live search results are upserted into care_options (server-side admin client) and merged back into later searches by state; only active rows of enabled sources are readable.
- care_options are re-validated weekly by a managed HTTP schedule calling /api/public/jobs/validate-care-options (cron-auth guarded); status rules live in src/lib/care-rules.ts (miss once → needs_review, twice → removed).
- Admin analytics come only from the admin_analytics() security-definer RPC (has_role checked inside, totals only).
- Sign-up password rules live in src/lib/password-rules.ts (sign-in unchanged); DB access is parameterized client/RPC calls only — never build raw SQL from user input.
- VA care guide text is fixed, VA.gov-verified content in src/lib/va-guide.ts (never AI-generated); shown when va_vs_community === 'va'. Admin password resets are logged via log_password_reset() RPC before the email is sent.
- VA facility search uses the VA Lighthouse Facilities API (connector 'va_facilities', VA_API_KEY secret, optional VA_API_BASE); without the key it returns nothing and the guide falls back to the VA.gov locator link.
- link_checks table is filled by the Sunday validate-care-options job (link-checks.server.ts); /helpful-links reads it to show each link's verified date.
