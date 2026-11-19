# Sunday accessibility preference checks

The GitHub Actions workflow `Sunday accessibility preferences` runs Sundays at
09:17 UTC, with manual runs available through `workflow_dispatch`. Scheduled
runs require this code on the GitHub repository's default branch and Actions
enabled. GitHub can delay scheduled runs; a completed hosted run has not yet
been verified from Lovable.

The rendered application tests use the real document, route tree, display
controls and preference bootstrap. Only remote services are mocked; no live
account, secrets, database changes or care-source validation are involved.

Each of the six high-contrast/text-size combinations is selected using the
display controls, checked on all 13 content pages, checked through back and
forward history, and checked after a fresh document bootstrap and remount.
The workflow retains JUnit results for 90 days. Failures appear as failed
GitHub Actions runs; GitHub notification delivery depends on account settings.

Run locally:

```sh
bunx vitest run src/test/app-routing.test.tsx src/lib/a11y-prefs.test.ts --testNamePattern='Weekly display preference persistence|display preferences'
```

These are preference-persistence regressions, not a claim of WCAG/Section 508
certification or an actual VoiceOver/NVDA speech test.