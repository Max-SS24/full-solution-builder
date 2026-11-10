import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, CrisisBar } from "@/components/SiteHeader";
import { AppointmentPrep } from "@/components/AppointmentPrep";
import type { VaStage } from "@/lib/va-guide";

const STAGES: VaStage[] = ["not_applied", "applied", "registered"];

export const Route = createFileRoute("/appointment-prep")({
  validateSearch: (s: Record<string, unknown>): { stage?: VaStage } =>
    STAGES.includes(s["stage"] as VaStage) ? { stage: s["stage"] as VaStage } : {},
  head: () => ({
    meta: [
      { title: "Prepare for your appointment | VA Navigator" },
      { name: "description", content: "Facts from official VA.gov pages on community care eligibility, referrals and urgent care, re-checked before they're shown." },
      { property: "og:title", content: "Prepare for your VA or community care appointment" },
      { property: "og:description", content: "What VA.gov says about eligibility, referrals and urgent care, with a source link for every fact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrepPage,
});

function PrepPage() {
  const { stage } = Route.useSearch();
  return (
    <div className="min-h-screen bg-cream text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Prepare for your appointment</h1>
        <p className="mt-2 max-w-2xl text-ink/75">Here are the facts we found on official VA.gov pages and what they suggest. Each one is checked against the live page before it's shown.</p>
        <div className="mt-6"><AppointmentPrep stage={stage ?? null} /></div>
      </main>
      <CrisisBar />
    </div>
  );
}
