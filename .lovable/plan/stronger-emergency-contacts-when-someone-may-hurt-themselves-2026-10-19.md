# Stronger emergency contacts when someone may hurt themselves or others

## What changes
1. **Opening message** — the emergency box starts with: "Your life is precious, and your safety is the priority right now. You don't have to go through this alone — please reach out to one of these right now." (Wording for harm-to-others: "...everyone's safety, including yours, is the priority right now.")
2. **Fuller emergency contact list**, shown before any care matches:
   - Veterans Crisis Line — call 988, then press 1
   - Text the Veterans Crisis Line — 838255
   - Veterans Crisis Line online chat — VeteransCrisisLine.net/chat
   - 988 Suicide & Crisis Lifeline — call or text 988
   - Crisis Text Line — text HOME to 741741
   - Emergency services — call 911 (or go to the nearest emergency room)
   Every phone/text item is a tap-to-call or tap-to-text button on phones.
3. **Better recognition of "thinking about it"** — catch phrases like "thinking about hurting myself", "thoughts of killing myself", "thinking of hurting someone", "I might hurt someone", "want to hurt myself/others", "harm myself/others".
4. **AI reply also leads with safety** — the chat's own reply in these cases opens with the same "life is precious" message before anything else.
5. Top care matches still appear below the emergency box (unchanged).

## Technical details
- `src/lib/navigator.functions.ts`: widen `CRISIS_RE` / `HARM_OTHERS_RE` (thinking/thoughts of/might/want to + hurt/harm/kill + myself/others/someone); when `danger` is set, prefix the reply with the safety sentence; add rule to SYSTEM prompt.
- `src/routes/index.tsx`: update the danger card heading copy and render the six contacts as links (`tel:`, `sms:`, https).
- Add vitest cases asserting the new phrases set danger to "self"/"others".
