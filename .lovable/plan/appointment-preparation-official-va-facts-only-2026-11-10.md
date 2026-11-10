# Appointment Preparation: Official VA facts only

## What the person will see
A new **Prepare for your appointment** section, opened from the chat results and from its own page. It is set up like a report:

1. **What we found:** short facts, each one quoting or closely restating an official VA.gov page, with a "Source: VA.gov – [page name]" link and a "Checked [date]" label.
2. **What it suggests:** a plain statement of what those facts mean for the person's situation, for example: "Based on these VA rules, you may want to ask your VA provider whether your drive time qualifies you for community care." It never promises an outcome.
3. **Questions you could bring to your VA provider:** a checklist made only from the facts above, each linking to its source.

A notice is always shown at the top and bottom:
> All guidance here comes from official U.S. Department of Veterans Affairs documentation, linked beside each item. VA Navigator is not part of VA and is not responsible for any approval or denial of care, eligibility, referrals or payment. Only VA makes those decisions.

## Topics (all written from VA.gov pages, never by the AI)
- Community care eligibility (drive-time and wait-time standards, when a referral is needed), from va.gov/communitycare
- Getting a community care referral and what happens after it
- In-network urgent care: who can use it and what it costs
- What to bring and how to prepare for a first VA appointment
- Shown by the person's stage (not applied / applied / registered) and VA or community preference, the same way the current VA guide works

## Checking the information is still accurate
- **Before showing it:** each time the section opens, the app checks each source page on VA.gov. A fact is shown only if its page still loads **and** still contains the key wording the fact is based on.
- If a page has changed or can't be reached, that fact is hidden and replaced with: "We couldn't confirm this is still current. See VA.gov directly: [link]." No unconfirmed fact is ever shown as current.
- **Every Sunday:** the same check runs in the weekly verification, and results show on the admin dashboard so you can see which facts need rewording after a VA page changes.
- Results of a check are reused for a short time (about an hour) so the page stays fast.

## In the chat
- When results are shown, or the person asks how to prepare or about referrals, the navigator offers "Would you like to see how to prepare for your appointment?" as its own question.
- The AI may say the section exists, but the facts and suggestions themselves come only from the fixed, checked list.

## Technical details
- `src/lib/appointment-prep.ts`: fixed list of facts `{id, topic, finding, suggests, askProvider?, sourceUrl, sourceLabel, evidence: string[], stages, preference}`; only allowlisted `www.va.gov` hosts. Content will be written after reading each live VA.gov page during the build.
- `src/lib/appointment-prep.server.ts` plus a public server fn `verifyPrepFacts`: fetch the allowlisted URLs with manual redirects, normalize the text, require every `evidence` phrase; cache in a new `prep_fact_checks` table (fact_id, ok, checked_at, http_status); public read, written only by the server.
- Sunday job: add to `/api/public/jobs/validate-care-options` (or a sibling job using the same cron guard).
- UI: `src/components/AppointmentPrep.tsx`, new route `/appointment-prep` with its own head() metadata, chat offer in `src/routes/index.tsx`, admin "Guidance sources" table.
- Tests: unverified facts are never returned; off-allowlist URLs are rejected; disclaimer text is always included; stage filtering is correct.
