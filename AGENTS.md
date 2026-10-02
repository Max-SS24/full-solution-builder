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
- AI provider is chosen server-side only via AI_PROVIDER env (grok|openai|gemini) in src/lib/ai/providers.server.ts — users never see or pick the model.
- Care search reads care_resources joined to data_sources; only enabled sources are returned (RLS), so admins control retrieval by toggling sources.
- First signed-in user to open /admin becomes admin via claim_first_admin(); roles live in user_roles, never on profiles.
- Registered-user search preferences live in user_preferences (jsonb, one row per user) and are merged server-side only where the chat left a variable empty.
