# Make screen readers follow page changes

## Problem
The app changes pages without reloading. Nothing tells VoiceOver or NVDA that a new page loaded, and focus stays on the menu link that was clicked. Screen readers keep reading the old page and don't announce the new one. This happens in the menu, the footer and all in-page links.

## Fix
1. **Announce every page change.** One hidden status message (shared by all pages) says "<Page title> page loaded" after each navigation.
2. **Move focus to the new page.** After navigation, focus goes to the new page's main heading, or to the main content area if a page has no heading. The screen reader then starts reading from there. Back/forward does the same.
3. **Close the mobile Menu on navigation** and return focus correctly, so the old menu content isn't read.
4. **Unique page titles:** confirm every page sets its own browser tab title, which screen readers read on load.
5. **The first page load is not changed.** Nothing jumps on the first visit, and the skip-to-main link still works.
6. Opening the chat or crisis panel stays exactly as it is now.

## Technical details
- A RouteAnnouncer component in __root subscribes to router `onResolved` (skipping the initial load). It reads `document.title` after head() updates and writes it into an `aria-live="polite"` sr-only region. Then it focuses `main h1` (adding `tabIndex=-1`) or `#main` with `preventScroll` off, and scrolls to the top.
- Check that each route has one `<main id="main">`, and add the missing ids.
- SiteHeader closes the Sheet menu on navigation.
- Tests: a new routing test clicks a link and asserts that the announcer text matches the new title and that `document.activeElement` is the new h1. Back navigation is checked too. A Playwright script checks real navigation and the accessibility tree.
- Add an AGENTS.md rule: route changes must announce the page and move focus.

Real VoiceOver/NVDA confirmation still needs your retest afterward.
