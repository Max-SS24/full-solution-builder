import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, Ext } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy | VA Navigator" },
      { name: "description", content: "What VA Navigator collects, how it is protected, and how to export or delete your data." },
      { property: "og:title", content: "Privacy policy | VA Navigator" },
      { property: "og:description", content: "How VA Navigator handles searches, accounts, and site analytics." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://va-navigator.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" intro="Searching for mental-health care is personal. This page explains what VA Navigator keeps, what it never does, and the choices you have.">
      <section aria-labelledby="p-none"><h2 id="p-none">Without an account</h2>
        <p>You can search without signing in. Your chat messages are sent to our server and an AI service to understand your request and find listings, and are not saved to an account. Optional questionnaire answers stay in your browser tab and are cleared when you close it.</p>
      </section>
      <section aria-labelledby="p-account"><h2 id="p-account">With an account</h2>
        <ul>
          <li>We store your email, password (managed by our sign-in service, never visible to us), saved preferences, questionnaire answers, and search history.</li>
          <li>Private search mode stops new searches from being saved to your history.</li>
          <li>Each account's data can be read only by that account. Optional email sign-in codes and recovery codes add protection; recovery codes are stored only in scrambled (hashed) form.</li>
          <li>We keep a security log of sign-in code and recovery-code events for your protection.</li>
        </ul>
      </section>
      <section aria-labelledby="p-never"><h2 id="p-never">What we never do</h2>
        <ul>
          <li>We never sell your data or use it for advertising.</li>
          <li>We never share your searches with the VA, providers, or insurers.</li>
          <li>We do not send your name or email to the AI service.</li>
        </ul>
      </section>
      <section aria-labelledby="p-device"><h2 id="p-device">Stored on your device</h2>
        <p>Your browser keeps your display settings (contrast, text size, motion), your sign-in session if you sign in, and questionnaire answers for the current tab. We use no advertising cookies.</p>
      </section>
      <section aria-labelledby="p-analytics"><h2 id="p-analytics">Site analytics</h2>
        <p>We use Lovable's visitor analytics to understand how the site is used. It uses no cookies, stores nothing on your device, doesn't keep IP addresses, and doesn't identify visitors. Lovable collects this data for us. <Ext href="https://lovable.dev/privacy">Lovable's privacy policy</Ext> explains how it handles it.</p>
        <p>It records the pages visited, where visitors came from, their country, browser, operating system and device type, how long they stay, how fast pages load, errors, which buttons and links are clicked, and a few app events (counts only, never care details). Detailed data is kept for 90 days and daily summaries for a year. This is recorded for every visitor, without cookies and without identifying anyone.</p>
        <p>Site administrators also see totals (such as number of searches) without personal details.</p>
      </section>
      <section aria-labelledby="p-others"><h2 id="p-others">Other services</h2>
        <ul>
          <li>Our hosting and database provider stores account data.</li>
          <li>An AI service reads chat messages to interpret requests.</li>
          <li>OpenStreetMap turns a city or ZIP code into a location for distances.</li>
          <li>Fonts load from Google Fonts, which receives your browser's standard request details.</li>
          <li>Links to VA.gov and provider websites follow those sites' own policies.</li>
        </ul>
      </section>
      <section aria-labelledby="p-rights"><h2 id="p-rights">Export or delete your data</h2>
        <p>From <Link to="/account">My account</Link> you can download your data or permanently delete your account, which removes your history, preferences, and security records. See <Link to="/security">Privacy & security</Link> for technical details.</p>
      </section>
    </LegalPage>
  );
}
