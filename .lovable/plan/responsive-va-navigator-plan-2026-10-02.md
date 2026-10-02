# Responsive VA Navigator plan

## Goal
Make every user and admin page comfortable and reliable on smartphones, tablets, laptops, and large desktop screens without changing the existing visual style or app behavior.

## Changes
- Rework the shared header into a compact mobile layout while preserving quick access to chat, history, account, and admin pages.
- Adjust page spacing, headings, forms, action rows, and cards so content wraps cleanly and tap targets remain usable on narrow screens.
- Update the home chat, enlarged conversation window, result cards, preference controls, and crisis actions for small screens and short viewports.
- Make account and history rows stack predictably on phones while retaining the current wider-screen layout.
- Make admin source controls, AI settings, and the audit log usable on mobile; keep the full table available with deliberate horizontal scrolling where needed.
- Add global safeguards for long words, URLs, and page-width overflow.

## Validation
- Check the public home and sign-in pages at representative phone, tablet, laptop, and desktop sizes.
- Check authenticated/admin layouts through source inspection and available signed-in preview access.
- Verify navigation, enlarged chat, forms, buttons, cards, and tables do not overlap or leave the viewport.
- Confirm the latest app build completes without errors.

## Technical details
- Use Tailwind responsive utilities and the existing semantic color/font tokens.
- Use mobile-first grid patterns with `min-w-0`, `shrink-0`, responsive stacking, safe viewport units, and bounded widths.
- Keep all existing data, authentication, search, history, and admin behavior unchanged.
