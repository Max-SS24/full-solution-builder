# 5. Accessibility Conformance Report (VPAT® 2.5 Rev 508 — Draft)

Last updated: 2026-11-14 · **Status: DRAFT — not yet a final conformance claim**

## 5.1 Product information
| Field | Value |
|-------|-------|
| Product | VA Navigator (web application) |
| Version | Pre-launch, November 2026 |
| URL | https://va-navigator.lovable.app |
| Description | Helps veterans find VA and community care, prepare for appointments, and reach crisis support. Not affiliated with VA. |
| Contact | _To be added at launch_ |
| Report date | 2026-11-14 |

## 5.2 Evaluation methods
- Automated axe-core audits of all 10 main pages (signed in), WCAG 2.1 A/AA rule sets.
- Automated tests for chat dialog, crisis links, keyboard focus, routing, back/forward and reload.
- Manual keyboard-only walkthroughs and accessibility-tree inspection.
- Layout checks at 320px–1920px (phones, foldables, tablets, laptops, desktops).
- **Not yet performed:** VoiceOver, NVDA and JAWS walkthroughs; print-layout and badge contrast audit; testing by users with disabilities.

## 5.3 Applicable standards
| Standard | Included |
|----------|----------|
| WCAG 2.1 Level A | Yes |
| WCAG 2.1 Level AA | Yes |
| Revised Section 508 (36 CFR 1194), Chapters 3 & 6 | Yes |
| Chapter 4 Hardware, Chapter 5 Software | Not applicable (web only) |

**Conformance terms:** Supports · Partially Supports · Does Not Support · Not Applicable · Not Evaluated.

## 5.4 WCAG 2.1 Level A
| Criterion | Level | Remarks |
|-----------|-------|---------|
| 1.1.1 Non-text Content | Supports | Icons are decorative or labelled; no informative images without text. |
| 1.2.1–1.2.3 Time-based Media | Not Applicable | No audio or video. |
| 1.3.1 Info and Relationships | Supports | Landmarks, headings, labelled fields, list/table markup. |
| 1.3.2 Meaningful Sequence | Supports | Reading order matches visual order. |
| 1.3.3 Sensory Characteristics | Supports | Instructions don't rely on shape, color or position. |
| 1.4.1 Use of Color | Supports | Status badges use text as well as color. |
| 1.4.2 Audio Control | Not Applicable | No audio. |
| 2.1.1 Keyboard | Supports | All features keyboard operable; tested. |
| 2.1.2 No Keyboard Trap | Supports | Dialogs close on Escape and return focus. |
| 2.1.4 Character Key Shortcuts | Supports | No single-key shortcuts. |
| 2.2.1 Timing Adjustable | Partially Supports | Email sign-in codes expire after 10 minutes (security); a new code can be resent. |
| 2.2.2 Pause, Stop, Hide | Supports | No auto-moving content; reduced-motion mode. |
| 2.3.1 Three Flashes | Supports | No flashing content. |
| 2.4.1 Bypass Blocks | Supports | "Skip to main content" on every page. |
| 2.4.2 Page Titled | Supports | Unique title per page. |
| 2.4.3 Focus Order | Supports | Logical; verified by tests. |
| 2.4.4 Link Purpose | Supports | Descriptive links; new-tab links announced. |
| 2.5.1–2.5.4 Pointer/Label/Motion | Supports | No gestures or motion input; visible labels match accessible names. |
| 3.1.1 Language of Page | Supports | `lang="en"`. |
| 3.2.1 On Focus / 3.2.2 On Input | Supports | Chat opens only on Enter, Space or typing, not on focus. |
| 3.3.1 Error Identification | Supports | Form errors shown in text. |
| 3.3.2 Labels or Instructions | Supports | All fields labelled; password rules shown. |
| 4.1.1 Parsing | Supports | Obsolete in WCAG 2.2; valid markup. |
| 4.1.2 Name, Role, Value | Supports | Standard controls; named dialogs. Screen-reader confirmation pending. |

## 5.5 WCAG 2.1 Level AA
| Criterion | Level | Remarks |
|-----------|-------|---------|
| 1.2.4–1.2.5 Captions/Audio Description | Not Applicable | No media. |
| 1.3.4 Orientation | Supports | Works in portrait and landscape. |
| 1.3.5 Identify Input Purpose | Supports | Autocomplete on email, password and location fields. |
| 1.4.3 Contrast (Minimum) | Partially Supports | Main pages pass; print card and some badges not yet audited. High-contrast mode available. |
| 1.4.4 Resize Text | Supports | Browser zoom to 200% plus built-in Large / Extra large text. |
| 1.4.5 Images of Text | Supports | None used. |
| 1.4.10 Reflow | Supports | No sideways scrolling at 320px. |
| 1.4.11 Non-text Contrast | Partially Supports | Focus rings and controls pass on main pages; full audit pending. |
| 1.4.12 Text Spacing | Supports | Layouts don't clip with increased spacing. |
| 1.4.13 Content on Hover or Focus | Supports | No hover-only popups. |
| 2.4.5 Multiple Ways | Supports | Header menu, footer links, in-page links. |
| 2.4.6 Headings and Labels | Supports | Descriptive headings and labels. |
| 2.4.7 Focus Visible | Supports | Visible focus indicator throughout. |
| 3.1.2 Language of Parts | Supports | Single language. |
| 3.2.3–3.2.4 Consistent Navigation/Identification | Supports | Shared header, footer and crisis bar. |
| 3.3.3 Error Suggestion | Supports | Errors explain how to fix. |
| 3.3.4 Error Prevention (Legal, Financial, Data) | Supports | Account deletion requires confirmation. |
| 4.1.3 Status Messages | Supports | Chat replies and check results use polite live regions. |

## 5.6 Revised Section 508
| Chapter | Status | Remarks |
|---------|--------|---------|
| 302 Functional Performance Criteria | Partially Supports | 302.1 Without Vision pending real screen-reader testing; other criteria supported via keyboard, contrast, text size and no audio. |
| 502 Interoperability with AT | Not Applicable | Web content (covered by WCAG). |
| 503 Applications | Supports | Respects OS/browser contrast, text size and reduced motion. |
| 504 Authoring Tools | Not Applicable | Not an authoring tool. |
| 602 Support Documentation | Supports | Accessibility statement at /accessibility; docs in Markdown/PDF. |
| 603 Support Services | Partially Supports | Accessibility contact to be added at launch. |

## 5.7 Open items before finalizing
1. VoiceOver (macOS/iOS) and NVDA or JAWS walkthroughs of chat, results, appointment prep, Care Card and account pages.
2. Contrast audit of the printable Care Card and status badges.
3. Add a real accessibility contact to /accessibility and section 5.1.
4. Optional: independent review by a Trusted Tester (DHS Section 508) or accessibility consultant.

When these are done, update the Remarks, change "Partially Supports" rows as appropriate, and remove the DRAFT status.

*VPAT® is a registered service mark of the Information Technology Industry Council (ITI).*
