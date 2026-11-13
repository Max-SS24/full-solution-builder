import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility statement | VA Navigator" },
      { name: "description", content: "VA Navigator's accessibility goals, features, testing status, and known limitations." },
      { property: "og:title", content: "Accessibility statement | VA Navigator" },
      { property: "og:description", content: "How VA Navigator works toward Section 508 and WCAG 2.1 AA." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://va-navigator.lovable.app/accessibility" }],
  }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility statement" intro="VA Navigator is meant to be usable by every Veteran and family member, including people who use screen readers, keyboards, magnifiers, or other assistive technology.">
      <section aria-labelledby="a-goal"><h2 id="a-goal">Our goal</h2>
        <p>We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, the standard used by Revised Section 508. We have not yet completed a formal conformance review, so we describe the site as working toward conformance, not as certified.</p>
      </section>
      <section aria-labelledby="a-features"><h2 id="a-features">What the site offers</h2>
        <ul>
          <li>High-contrast mode, three text sizes, and reduced motion, saved on your device.</li>
          <li>A "Skip to main content" link and full keyboard use. Dialogs keep focus inside, close with Escape, and return you to where you were.</li>
          <li>Labeled form fields, page landmarks, and one main heading on every page.</li>
          <li>Chat replies announced to screen readers as they arrive.</li>
          <li>Links that open a new tab say so.</li>
          <li>Crisis support (988 then Press 1, text 838255, TTY 711) is always one step away.</li>
        </ul>
      </section>
      <section aria-labelledby="a-testing"><h2 id="a-testing">How we test</h2>
        <ul>
          <li>Automated accessibility checks (axe-core) on every page.</li>
          <li>Automated keyboard, dialog, and crisis-link tests run with each change.</li>
          <li>Not yet done: hands-on testing with VoiceOver, NVDA, and JAWS, and a formal Accessibility Conformance Report (VPAT).</li>
        </ul>
      </section>
      <section aria-labelledby="a-limits"><h2 id="a-limits">Known limitations</h2>
        <ul>
          <li>Admin charts may be hard to read with a screen reader; the same numbers can be downloaded as CSV files.</li>
          <li>Linked VA.gov and provider websites are run by others and have their own accessibility.</li>
        </ul>
      </section>
      <section aria-labelledby="a-feedback"><h2 id="a-feedback">Tell us about a barrier</h2>
        <p>If something is hard to use, please tell us what page you were on and what happened. For guidance problems, use the "Report an issue" button on the <Link to="/appointment-prep">Appointment prep</Link> page. A dedicated accessibility contact address will be listed here at launch.</p>
      </section>
    </LegalPage>
  );
}
