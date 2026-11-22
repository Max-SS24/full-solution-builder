# 6. Operations & Testing

Last updated: 2026-11-20

## 6.1 Weekly operations (every Sunday)
1. Listings, VA directory, hours and community evidence are rechecked in batches.
2. New VA facilities are discovered from VA.gov sitemaps.
3. Helpful links and appointment-prep sources are checked.
4. Public pages get an accessibility audit.

**Admin follow-up (Monday):** open Admin -> Weekly checks, review alerts, deep-recheck failures, mark manually validated only with a note, and mark accessibility failures reviewed after fixing.

## 6.2 Automated tests
| Suite | Covers |
|-------|--------|
| Unit (Vitest) | Care rules, distance, guest limits, website-check rules, PDF, QA fixes, a11y audit rules |
| Integration (Testing Library + axe-core) | Chat dialog, crisis links, keyboard, Care Card print, appointment prep refresh |
| Routing (real route tree) | All 13 pages: direct load, links, back/forward, announcements, preference persistence |
| Live browser (Python Playwright) | Navigation, QA retest steps, manual validation history, guest guided chat and word matching, empty/ambiguous/unsupported guest searches, email-free admin activity log |
| Access checks (Python) | Role, public-read and appointment-prep visibility rules |

Total: 270+ automated test cases, all passing as of this date. Run with `bunx vitest run`.

## 6.3 QA report (Nov 15, 2026) status
All 10 defects (VA-001 to VA-010) are fixed with regression tests; live retest passed.

## 6.4 Before launch
- Connect a sender domain (enables recovery-code and admin email alerts).
- Add accessibility contact to /accessibility and the VPAT.
- Real VoiceOver / NVDA / JAWS re-test after the page-change fix.
- Contrast audit of the Care Card and badges.
- Legal review of Privacy and Terms pages.
