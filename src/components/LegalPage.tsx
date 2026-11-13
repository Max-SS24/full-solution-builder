import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

export const LEGAL_UPDATED = "November 13, 2026";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm font-semibold text-ink/70">Last updated: {LEGAL_UPDATED}</p>
        <p className="mt-4 text-ink/80">{intro}</p>
        <div className="mt-8 space-y-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_li]:mt-1 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:font-bold [&_a]:underline">
          {children}
        </div>
      </main>
    </div>
  );
}

export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a>;
}
