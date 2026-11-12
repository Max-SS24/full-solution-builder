# 4. Accessibility (Section 508 / WCAG 2.1 AA)

Last updated: 2026-11-12

## 4.1 Visual accommodations
- High-contrast mode.
- Text size: Standard, Large, Extra large.
- Reduced motion.
- Preferences saved on the device and applied before the page paints (no flash).

## 4.2 Keyboard
- "Skip to main content" is the first tab stop on every page.
- Dialogs trap focus, close on Escape, and return focus to the trigger.
- The chat opens only by Enter, Space, or typing — never by tabbing past it.

## 4.3 Screen readers
- Semantic landmarks and one main heading on all 10 pages.
- Every form field has a visible, associated label.
- Chat replies announced through a polite live region.
- New-tab links announce "opens in a new tab."

## 4.4 Crisis access
- Persistent crisis bar: 988 Press 1, text 838255, online chat, TTY 711, 911 — all with clear accessible names.

## 4.5 Testing status
| Check | Status |
|-------|--------|
| Automated axe-core audit (10 signed-in pages) | Passed |
| Automated keyboard/dialog/crisis tests | Passed |
| Live browser navigation, back/forward, reload | Passed |
| VoiceOver (macOS/iOS), NVDA/JAWS (Windows) | **Not yet verified** |
| Formal VPAT / Accessibility Conformance Report | **Not yet prepared** |

Designed to WCAG 2.1 AA; formal Section 508 / ADA conformance requires the manual checks above.
