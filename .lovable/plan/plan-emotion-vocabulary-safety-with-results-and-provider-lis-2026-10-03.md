# Plan: Emotion vocabulary, safety-with-results, and provider lists

These are held until you say "build".

## 1. Recognize everyday words for depression, anxiety, grief, PTSD, trauma
- Teach the chat (both the AI and the backup matcher) common phrasing: "feeling down / numb / empty / can't get out of bed" means depression; "on edge / can't breathe / racing thoughts / keyed up" means anxiety; "lost my buddy / can't stop missing" means grief; "flashbacks / nightmares / hypervigilant / back in the sandbox" means PTSD; and similar phrases for trauma, MST and substance use.

## 2. Danger signs: show emergency help along with the top matches
- Watch for a much wider set of warning signs about hurting themselves, like "no point anymore", "better off without me" or "thinking of ending it". Also watch for signs about hurting others, like "want to hurt someone" or "going to snap on someone".
- When a sign appears, the reply opens with a highlighted emergency box:
  - Veterans Crisis Line: call 988 then press 1, text 838255, or chat online
  - 911 for immediate danger to self or others
  - Our current 988 shortcuts stay in place.
- Below the box, the top 3 care matches still appear, using whatever we know so far (Atlanta, GA when no location is given). Today a crisis hides the results; this change keeps them.
- The big chat box stays open so they can see both.

## 3. Provider list for community care and private practice
- On each community care or private practice result, a "See providers" button opens a list of the individual clinicians there. Each one shows:
  - name and credentials
  - the insurance they accept, with a "Takes your insurance" badge when it matches the plan you gave
  - their posted bio or description
  - a link to the source
- When you've told us your insurance, providers who take it appear first.
- The bot also mentions this in chat, for example: "Here are 3 providers at X who take TRICARE."
- Admins can turn this off by switching off its source on the Admin page, the same as any other data.

Note: right now there is no real provider data. I'll add a few clearly marked sample providers for the Atlanta listings so you can demo it. Real data would later come from approved sources like Psychology Today or the state licensing boards.

## Technical details
- `src/lib/navigator.functions.ts`: add the vocabulary to the SYSTEM prompt and `fallbackExtract`; add a separate `HARM_OTHERS_RE` and return a `danger: "self" | "others" | null` flag; always compute results, even during a crisis, and stop clearing results when `crisis` is set.
- New table `care_providers` (id, resource_id → care_resources, name, credentials, insurance text[], bio, source_url, last_checked). Add GRANTs, RLS with public read only when the parent source is enabled, and seed sample rows in the migration.
- New server function `getProviders(resourceId, payment)`, which sorts matching insurance first. Results for non-VA kinds show "See providers".
- `src/routes/index.tsx`: add the emergency card, keep results visible when there's a crisis, and add the provider list panel.
- Add these tasks to roadmap.md when the build starts.
