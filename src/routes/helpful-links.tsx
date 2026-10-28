import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, CrisisBar } from "@/components/SiteHeader";
import { LOCATORS, FORMS, LINKS_VERIFIED_ON, type HelpfulLink } from "@/lib/helpful-links";

export const Route = createFileRoute("/helpful-links")({
  head: () => ({
    meta: [
      { title: "Helpful links | VA Navigator" },
      { name: "description", content: "Official VA.gov facility locators and common VA forms, checked every Sunday." },
      { property: "og:title", content: "Helpful VA links and forms | VA Navigator" },
      { property: "og:description", content: "VA locators and forms from VA.gov, verified weekly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpfulLinksPage,
});

type Check = { url: string; ok: boolean; checked_at: string };
const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

function HelpfulLinksPage() {
  const [checks, setChecks] = useState<Record<string, Check>>({});
  useEffect(() => {
    supabase.from("link_checks").select("url, ok, checked_at").then(({ data }) => {
      setChecks(Object.fromEntries((data ?? []).map((c) => [c.url, c])));
    });
  }, []);

  const card = (l: HelpfulLink) => {
    const c = checks[l.url];
    const when = c ? fmt(c.checked_at) : fmt(LINKS_VERIFIED_ON + "T12:00:00");
    return (
      <li key={l.url} className="flex flex-col rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard">
        {l.form && <span className="mb-2 w-fit rounded-full bg-sun px-3 py-0.5 text-xs font-bold">{l.form}</span>}
        <p className="font-display text-lg font-bold">{l.title}</p>
        <p className="mt-1 flex-1 text-sm text-ink/75">{l.detail}</p>
        <a href={l.url} target="_blank" rel="noreferrer" className="mt-3 break-all text-sm font-bold underline">{l.url.replace("https://www.", "")} ↗</a>
        <p className={`mt-2 text-xs font-semibold ${c && !c.ok ? "text-coral" : "text-ink/60"}`}>
          {c && !c.ok ? `Could not confirm this page on ${when}. Check VA.gov directly.` : `✓ Verified on VA.gov · ${when}`}
        </p>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-cream text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Helpful links</h1>
        <p className="mt-2 max-w-2xl text-ink/75">Official VA.gov locators and forms for getting care and benefits.</p>
        <p className="mt-4 rounded-2xl border-[3px] border-ink bg-minttint px-4 py-3 text-sm font-semibold">
          These links are verified once a week, every Sunday morning, to make sure each VA.gov page is still live and current.
        </p>
        <h2 className="mt-10 font-display text-2xl font-bold">Find VA locations</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">{LOCATORS.map(card)}</ul>
        <h2 className="mt-10 font-display text-2xl font-bold">Helpful VA forms</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{FORMS.map(card)}</ul>
      </main>
      <CrisisBar />
    </div>
  );
}
