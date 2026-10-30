# Plan: Preferences, VA status, questionnaire and gentler results

## 1. Remove saved preferences one at a time

- On My account, each saved preference chip gets a small "x" to remove just that one. "Clear preferences" stays for removing all.

## 2. Switching between VA and community care mid-chat

- When the person changes their mind (community to VA, or VA to community), the newest choice wins and earlier results of the other type are cleared.
- VA only: only VA facilities and Vet Centers plus the VA guide. Community only: no VA listings and no VA guide.
- The matcher's earlier choice is no longer kept if the latest message says something different.
- add in a 3rd option of "both", if the vetrain whats to look at both options, show steps for VA care, and best care options out of Community and VA.

## 3. New VA questions

New things the chat remembers (only asked when the person wants VA care):

- **Applied for VA health care?** yes / no
- **Registered as a VA patient?** yes / no / not sure
- **Which VA facility are you registered at?** (asked only if registered). If they don't know, the chat explains how to find out: look on the VA health card or VA.gov "My HealtheVet", or call VA at 877-222-8387 (taken from VA.gov, checked before use).

## 4. Step-by-step guide adjusts to their situation

- Not applied: full guide starting with eligibility and applying.
- Applied, not yet registered/approved: skip to checking application status and what to expect next.
- Registered: skip the application steps; show how to request mental health care at their facility, schedule, and community care through VA. Their registered facility is shown first in results when found.
- Every step keeps its VA.gov citation and verified date; no AI-written steps.

## 5. Optional questionnaire page

- New "Quick questions" page (linked from the header and from the chat) with the main details: need, location/ZIP, VA or community, one-on-one or group, in person or telehealth, payment/insurance, applied for VA care, registered, facility.
- Every question is optional with a "Skip" option. Answers are used in the next chat so it asks fewer questions. Signed-in users can save them as preferences; guests' answers last for that visit only.

## 6. Ask before showing results

- When enough is known, the chat stays open and asks: "I have some options ready. Would you like to see your results now?"
- Yes: chat shrinks and results show. No: "Okay, is there anything else I can help with?" and the chat stays open; they can say "show results" anytime. A "Show my results" button also appears under the chat.
- Crisis messages still show emergency contacts immediately (no change).

## Technical details

- `account.tsx`: per-key remove calling `savePrefs` without that key.
- `navigator.functions.ts`: add `va_applied`, `va_registered`, `va_facility` variables (AI prompt + fallback regex); latest-message override for `va_vs_community`; return `readyToShow` + `vaStage`; handle yes/no confirmation replies.
- `va-guide.ts`: tag steps by stage, add `guideFor(stage)`; tests for each stage and for the VA/community switch.
- `index.tsx`: hold results until confirmed; clear opposite-type results on switch; "Show my results" button.
- New route `src/routes/questionnaire.tsx`; answers passed as `prefs` (sessionStorage for guests, `user_preferences` for signed-in). No database changes needed.