import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CareResult } from "@/lib/navigator.functions";
import type { VaStage } from "@/lib/va-guide";
import { HOURS_NOTICE } from "@/lib/va-hours";
import { verifyPrepFacts } from "@/lib/appointment-prep.functions";
import { PREP_DISCLAIMER, applyChecks, factsFor, type PrepCheck } from "@/lib/appointment-prep";
import { cardAddress, cardStatus } from "@/lib/care-card";

type Facility = { name: string; address: string | null; phone: string | null; url: string | null; hours?: string | null; found: boolean } | null;
const day = (d: string) => {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "Not confirmed" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
};

export function CareCard({ facility, results, stage }: {
  facility: Facility; results: CareResult[]; stage: VaStage | null; facilityUnknown: boolean;
}) {
  const verify = useServerFn(verifyPrepFacts);
  const [checks, setChecks] = useState<PrepCheck[]>([]);
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    let active = true;
    verify().then((r) => { if (active) setChecks(r.checks); }).catch(() => { if (active) setChecks([]); });
    return () => { active = false; };
  }, [verify]);
  const top = results.filter((r) => r.name !== facility?.name).slice(0, 3);
  const steps = applyChecks(factsFor(stage), checks).filter((v) => v.verified && v.fact.topic === "referral").slice(0, 3);
  async function printCard() {
    setPrinting(true);
    let current: PrepCheck[] = [];
    try { current = (await verify()).checks; } catch { /* Unconfirmed guidance stays withheld. */ }
    flushSync(() => { setChecks(current); setPrinting(false); });
    window.print();
  }
  return (
    <section aria-label="Your care card" className="mt-8 border-t-2 border-border py-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h2 className="font-display text-xl font-bold">Your care card</h2>
        <Button disabled={printing} onClick={printCard} className="h-auto min-h-10 whitespace-normal"><Printer aria-hidden="true" />{printing ? "Checking VA guidance…" : "Print or save as PDF"}</Button>
      </div>
      <div id="care-card" className="mt-4 border border-border bg-card p-4 text-sm sm:p-5">
        <h3 className="font-display text-lg font-bold">VA Navigator · Care card</h3>
        <p className="text-xs text-muted-foreground">Prepared {day(new Date().toISOString())} · Keep this personal care information private.</p>
        {facility && (
          <section className="mt-3">
            <h4 className="font-bold">Your VA facility: {facility.name}</h4>
            {facility.found ? <>
              <p>{facility.address ?? "Street address not supplied"}</p>
              <p>Phone: {facility.phone ? <a href={`tel:${facility.phone}`} className="underline">{facility.phone}</a> : "Not supplied"}</p>
              <p>Hours: {facility.hours ?? "Not supplied — contact the facility"}</p>
              {facility.url && <a href={facility.url} className="block break-all text-xs underline">{facility.url}</a>}
            </> : <p>Facility not matched to an official listing; address and phone unconfirmed.</p>}
          </section>
        )}
        {top.length > 0 && (
          <section className="mt-3">
            <h4 className="font-bold">Matched care options</h4>
            <ul className="mt-1 space-y-2">
              {top.map((r) => (
                <li key={r.id} className="break-inside-avoid">
                  <p className="font-semibold">{r.name}{r.distance_miles != null ? ` · ${r.geo_estimated ? "about " : ""}${r.distance_miles.toFixed(1)} straight-line mi` : ""}</p>
                  <p>{cardAddress(r) ?? ([r.city, r.state].filter(Boolean).join(", ") || "Street address not supplied")}</p>
                  <p>Phone: {r.phone ? <a href={`tel:${r.phone}`} className="underline">{r.phone}</a> : "Not supplied"} · Hours: {r.hours ?? "Not supplied"}</p>
                  <p className="text-xs">{cardStatus(r)} · Last check: {day(r.last_checked)}</p>
                  <a href={r.source_url} className="block break-all text-xs underline">Source: {r.source_url}</a>
                  {r.provider_website && <a href={r.provider_website} className="block break-all text-xs underline">Provider: {r.provider_website}</a>}
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-2 text-xs font-semibold">{HOURS_NOTICE}</p>
        <section className="mt-3">
          <h4 className="font-bold">Appointment preparation · VA.gov findings</h4>
          {steps.length ? <ol className="mt-1 list-decimal space-y-2 pl-5">
            {steps.map((v) => <li key={v.fact.id} className="break-inside-avoid">
              <p><strong>Finding:</strong> {v.fact.finding}</p>
              <p><strong>Suggestion:</strong> {v.fact.suggests}</p>
              <a href={v.fact.sourceUrl} className="block break-all text-xs underline">{v.fact.sourceUrl}</a>
              <p className="text-xs">Source confirmed: {day(v.checkedAt)}</p>
            </li>)}
          </ol> : <p>Current appointment steps are not confirmed for your stated VA status. Review official guidance at <a className="break-all underline" href="https://www.va.gov/health-care/">https://www.va.gov/health-care/</a> or contact your VA team.</p>}
        </section>
        <p className="mt-3 font-semibold">Veterans Crisis Line: dial 988, then press 1 · Text 838255</p>
        <a href="https://www.veteranscrisisline.net/" className="break-all text-xs underline">https://www.veteranscrisisline.net/</a>
        <p className="mt-3 text-xs">{PREP_DISCLAIMER}</p>
      </div>
    </section>
  );
}
