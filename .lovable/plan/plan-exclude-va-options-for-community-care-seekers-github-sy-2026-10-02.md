# Plan: Exclude VA options for community-care seekers + GitHub sync

## 1. Hard-filter VA results when someone wants community care

Today, saying "community care" or "not the VA" only *boosts* non-VA results in the scoring — VA facilities can still appear in the top 3.

Change in `src/lib/navigator.functions.ts`:

- When `va_vs_community` is `"community"`, **remove** all VA facilities and Vet Centers from the candidate list before scoring, so they can never be shown.
- Expand the fallback keyword detection so phrases like "don't want to deal with the VA", "no government", "not VA", "civilian" all set `va_vs_community: "community"`.
- Update the AI prompt (used once the Grok key is connected) so the model also treats anti-VA / anti-government statements as `"community"`.
- If filtering leaves zero results, the reply says so kindly and offers to include VA options if they'd reconsider — rather than silently showing VA results.

## 2. GitHub repository

I cannot connect GitHub from inside the code — this is a one-time step you do in the editor:

1. Open the **Plus (+) menu** in the chat input → **GitHub → Connect project**.
2. Authorize the Lovable GitHub App and pick your account/organization.
3. Click **Create Repository** — Lovable creates the repo with all current code.

After that, every change I make (including this one) syncs to GitHub automatically. You can then create branches in GitHub (or ask me to work on a branch once the repo is connected — branch switching is available in the editor).

## Technical details

- Edit scoring section of `navigate()` in `src/lib/navigator.functions.ts`: pre-filter `results` by `r.kind` when `va_vs_community === "community"`; add empty-result fallback message; extend regex in the fallback variable extraction; update the system prompt text.
- No database or UI changes needed.
- Verify with build log after edits.
