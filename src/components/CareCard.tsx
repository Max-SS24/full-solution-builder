import { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CareResult } from "@/lib/navigator.functions";
import type { VaStage } from "@/lib/va-guide";
import { HOURS_NOTICE } from "@/lib/va-hours";
import { verifyPrepFacts } from "@/lib/appointment-prep.functions";
import { PREP_DISCLAIMER, applyChecks, factsFor, type PrepCheck } from "@/lib/appointment-prep";
import { cardAddress, cardStatus } from "@/lib/care-card";
import { deliverFile } from "@/lib/download-file";
import { EMPTY_MINE, MINE_LABEL, hasMine, loadMine, saveMine, type MyCardDetails } from "@/lib/care-card-mine";

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [pdfError, setPdfError] = useState("");
  const [pdfRevision, setPdfRevision] = useState(0);
  const [checked, setChecked] = useState(false);
  const [mine, setMine] = useState<MyCardDetails>(EMPTY_MINE);
  const [editing, setEditing] = useState(false);
  useEffect(() => { setMine(loadMine()); }, []);
  const updateMine = (k: keyof MyCardDetails, v: string) => setMine((m) => { const n = { ...m, [k]: v }; saveMine(n); return n; });
  useEffect(() => {
    let active = true;
    const refresh = () => {
      setPdf(null);
      setChecked(false);
      verify().then((r) => { if (active) { setChecks(r.checks); setChecked(true); } }).catch(() => { if (active) { setChecks([]); setChecked(true); } });
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [verify]);
  useEffect(() => {
    let active = true;
    setPdf(null);
    setPdfError("");
    if (!checked || !cardRef.current) return;
    const card = cardRef.current;
    import("@/lib/care-card-pdf").then(async ({ cardParagraphs, createCareCardPdf }) => {
      const blob = await createCareCardPdf(cardParagraphs(card));
      if (active) setPdf(blob);
    }).catch(() => { if (active) setPdfError("We couldn't create your PDF. Please try again or use Print."); });
    return () => { active = false; };
  }, [checks, checked, facility, results, stage, pdfRevision, mine]);
  const top = results.filter((r) => r.name !== facility?.name).slice(0, 3);
  const steps = applyChecks(factsFor(stage), checks).filter((v) => v.verified && v.fact.topic === "referral").slice(0, 3);
  const unconfirmed = !facility?.found || steps.length === 0;
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
        <div className="flex flex-wrap gap-2">
          <Button disabled={!pdf} aria-busy={!pdf} onClick={() => {
            if (!pdf) return;
            deliverFile(pdf, "VA-Navigator-Care-Card.pdf").catch(() => setPdfError("We couldn't download your PDF. Please try again or use Print."));
          }} className="h-auto min-h-10 whitespace-normal"><Download aria-hidden="true" />Download PDF</Button>
          <Button variant="outline" disabled={printing} onClick={printCard} className="h-auto min-h-10 whitespace-normal"><Printer aria-hidden="true" />{printing ? "Checking VA guidance…" : "Print or save as PDF"}</Button>
        </div>
      </div>
      {pdfError && <div role="status" className="mt-2 text-sm print:hidden">{pdfError} <Button variant="outline" onClick={() => setPdfRevision((n) => n + 1)}>Retry PDF</Button></div>}
      {(unconfirmed || hasMine(mine)) && (
        <div className="mt-3 border border-border bg-muted/40 p-3 text-sm print:hidden">
          <p>{unconfirmed ? "Some details on this card couldn't be confirmed. You can add the information yourself so your card is complete." : "You've added your own details to this card."}</p>
          <Button variant="outline" className="mt-2" aria-expanded={editing} aria-controls="care-card-mine" onClick={() => setEditing((e) => !e)}>{editing ? "Done" : hasMine(mine) ? "Edit my details" : "Add this myself"}</Button>
          {editing && (
            <div id="care-card-mine" className="mt-3 grid gap-3 sm:grid-cols-2">
              {([["facility", "Facility or clinic name"], ["address", "Address"], ["phone", "Phone number"], ["appointment", "Appointment date and time"]] as const).map(([k, l]) => (
                <label key={k} className="grid gap-1 font-semibold">{l}
                  <input value={mine[k]} maxLength={160} onChange={(e) => updateMine(k, e.target.value)} className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal" />
                </label>
              ))}
              <label className="grid gap-1 font-semibold sm:col-span-2">Notes (for example steps your VA team told you)
                <textarea value={mine.notes} maxLength={400} rows={3} onChange={(e) => updateMine("notes", e.target.value)} className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal" />
              </label>
              <p className="text-xs text-muted-foreground sm:col-span-2">Saved only on this device until you close the tab. Not checked against VA.gov.</p>
              {hasMine(mine) && <Button variant="outline" className="sm:col-span-2 sm:justify-self-start" onClick={() => { setMine(EMPTY_MINE); saveMine(EMPTY_MINE); }}>Clear my details</Button>}
            </div>
          )}
        </div>
      )}
      <div ref={cardRef} id="care-card" className="mt-4 border border-border bg-card p-4 text-sm sm:p-5">
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
        {hasMine(mine) && (
          <section className="mt-3 border-l-4 border-border pl-3">
            <h4 className="font-bold">Your own details ({MINE_LABEL})</h4>
            {mine.facility && <p>Facility: {mine.facility}</p>}
            {mine.address && <p>Address: {mine.address}</p>}
            {mine.phone && <p>Phone: {mine.phone}</p>}
            {mine.appointment && <p>Appointment: {mine.appointment}</p>}
            {mine.notes && <p>Notes: {mine.notes}</p>}
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
          <h4 className="font-bold">If you seek VA-authorized community care · VA.gov findings</h4>
          {steps.length ? <ol className="mt-1 list-decimal space-y-2 pl-5">
            {steps.map((v) => <li key={v.fact.id} className="break-inside-avoid">
              <p><strong>Finding:</strong> {v.fact.finding}</p>
              <p><strong>Suggestion:</strong> {v.fact.suggests}</p>
              <a href={v.fact.sourceUrl} className="block break-all text-xs underline">{v.fact.sourceUrl}</a>
              <p className="text-xs">Source confirmed: {v.verified ? day(v.checkedAt) : "Not confirmed"}</p>
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
