# A more natural, flexible navigator

## What changes for the person chatting
- The navigator speaks like a warm, steady peer who knows the VA system. Replies can be short or a few sentences, depending on what the person said. They no longer follow a fixed "sympathy line + two questions" formula.
- It answers whatever the person actually says first: off-topic questions, small talk, venting, jokes, confusion, "what is a Vet Center?", "do I qualify?", "I'm just tired", frustration with the VA, or rude or unclear messages. Then, only when it fits, it guides them back toward finding care.
- It asks one gentle question at a time, and only when the answer would really help. It skips questions when it can make a reasonable guess. After results are shown, follow-ups feel like normal conversation ("want me to look closer to home?", "would a group be easier?") instead of re-running the checklist.
- It mirrors the person's tone and wording, avoids jargon, never lectures, and never repeats a question they already answered.
- Safety stays the same: crisis detection and the fixed crisis reply are unchanged, it never diagnoses, and the VA guide text stays fixed.

## Kinds of messages it will handle gracefully
- Greetings, thanks, "who are you?", "is this private?", "are you a real person?"
- General questions about VA benefits, eligibility, Vet Centers, telehealth or costs. It gives a brief, plain answer and points to official links, without making up specifics.
- Emotional sharing without a request. It listens first and doesn't rush to search.
- Changing their mind, correcting details, mixed messages, typos, slang and military shorthand.
- Questions it can't help with, such as legal, medical dosing or unrelated topics. It politely says so and offers what it can do.

## Technical details
- `src/lib/navigator.functions.ts`:
  - Rewrite `SYSTEM` as a persona plus principles prompt. Keep the JSON output contract (`reply`, `crisis`, `variables`) and all variable definitions exactly as they are, so extraction doesn't regress.
  - Add a field `intent: "search" | "question" | "chat" | "refine"` and a field `asks: boolean`. These let the server know when the reply is conversational and should not get checklist text appended.
  - Pass a short context note to the AI with the variables already known and whether results were already shown. This lets it make follow-ups refinements instead of repeat questions.
  - When `intent` isn't "search"/"refine", do not append the forced VA question, the "Scroll to…" line or the guide sentence. Show results again only if something changed.
  - Make the forced VA-question append and the canned fallback templates kick in only when the AI is unavailable. Shorten the fallback wording so it's less scripted.
  - Keep the separate "Would you like to see your results now?" step and `onlyStatements()`.
- Tests: add cases confirming that a chat or question turn adds no checklist text, and that the crisis reply is unchanged.
