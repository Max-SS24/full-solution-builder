import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of use & disclaimers | VA Navigator" },
      { name: "description", content: "VA Navigator is independent of the VA and provides information only, not eligibility decisions or medical advice." },
      { property: "og:title", content: "Terms of use & disclaimers | VA Navigator" },
      { property: "og:description", content: "Independence, information-only, and crisis notices for VA Navigator." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://va-navigator.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms of use & disclaimers" intro="By using VA Navigator you agree to these terms. Please read the notices below.">
      <section aria-labelledby="t-crisis" className="rounded-2xl border-[3px] border-ink bg-sun p-5"><h2 id="t-crisis">Not an emergency service</h2>
        <p>If you are in crisis, call 988 and press 1, text 838255, or call 911. VA Navigator cannot respond to emergencies.</p>
      </section>
      <section aria-labelledby="t-indep"><h2 id="t-indep">Independent from the VA</h2>
        <p>VA Navigator is an independent project. It is not run, endorsed, or approved by the U.S. Department of Veterans Affairs or any government agency. VA names and links are used only to point you to official sources.</p>
      </section>
      <section aria-labelledby="t-info"><h2 id="t-info">Information only</h2>
        <ul>
          <li>Nothing here is medical, legal, or benefits advice.</li>
          <li>VA Navigator does not decide and is not responsible for any approval or denial of VA health care, community care, or benefits. Only the VA makes those decisions.</li>
          <li>Guidance comes from official VA.gov pages and is shown with its source. Always confirm on VA.gov or with your VA facility.</li>
        </ul>
      </section>
      <section aria-labelledby="t-listings"><h2 id="t-listings">Listings, hours, and distances</h2>
        <ul>
          <li>Listings come from official directories and are checked weekly, but details can change between checks.</li>
          <li>Hours may not be accurate. Call before you go.</li>
          <li>Distances are straight-line estimates, not driving distance.</li>
          <li>A listing does not mean a provider accepts you, takes your insurance, or has openings.</li>
        </ul>
      </section>
      <section aria-labelledby="t-ai"><h2 id="t-ai">AI assistant</h2>
        <p>The chat uses AI to understand your request. It can make mistakes. Listings and guidance come from checked sources, not from the AI.</p>
      </section>
      <section aria-labelledby="t-use"><h2 id="t-use">Using the site</h2>
        <ul>
          <li>Don't misuse the site, try to access other people's data, or overload it.</li>
          <li>Keep your sign-in details private. You can delete your account any time.</li>
          <li>The site is provided "as is" without warranties. To the extent the law allows, VA Navigator is not liable for decisions made based on its information.</li>
          <li>We may update these terms; the date above shows the latest version.</li>
        </ul>
        <p>See also our <Link to="/privacy">Privacy policy</Link> and <Link to="/accessibility">Accessibility statement</Link>.</p>
      </section>
    </LegalPage>
  );
}
