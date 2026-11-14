# VA Navigator Documentation

Living documentation for the VA Navigator IT Capstone. Each section is a standalone file so it can be presented or exported on its own.

| # | Document | Covers |
|---|----------|--------|
| 1 | [Architecture](01-architecture.md) | Tech stack, AI workflow, database, data verification pipeline |
| 2 | [Capabilities](02-capabilities.md) | What veterans and admins can do in the app |
| 3 | [Data Security](03-security.md) | Access control, MFA, privacy, erasure |
| 4 | [Accessibility](04-accessibility.md) | Section 508 / WCAG 2.1 AA features and testing status |
| 5 | [VPAT / Conformance Report](05-vpat.md) | Draft Section 508 / WCAG 2.1 AA criterion-by-criterion report |

**Keeping it current:** when a feature changes, update the matching file and its "Last updated" line.

**Exporting:** each file is plain Markdown. Combined PDF: `docs/export.sh` (requires pandoc), or open any file in GitHub / VS Code preview and print to PDF.

Last updated: 2026-11-14
