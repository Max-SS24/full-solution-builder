import type { CareResult } from "@/lib/navigator.functions";
import { guideFor, type VaStage } from "@/lib/va-guide";

type Facility = { name: string; address: string | null; phone: string | null; url: string | null; found: boolean } | null;

const day = (d: string) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

/** One-page care summary. Printing hides the rest of the page (see #care-card rules in styles.css). */
export function CareCard({ facility, results, stage, facilityUnknown }: {
  facility: Facility; results: CareResult[]; stage: VaStage | null; facilityUnknown: boolean;
}) {
  const top = results.filter((r) => r.name !== facility?.name).slice(0, 3);
  const steps = guideFor(stage, facilityUnknown);
  return (
    <section aria-label="Your care card" className="mt-8 rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="font-display text-xl font-bold">Your care card</p>
          <p className="text-sm text-ink/70">A one-page summary to print, or save as a PDF from the print window.</p>
        </div>
        <button type="button" onClick={() => window.print()} className="rounded-full bg-navy px-5 py-2 text-sm font-semibold text-cream shadow-hard">🖨️ Print or save as PDF</button>
      </div>
      <div id="care-card" className="mt-4 rounded-2xl border-2 border-ink bg-cream p-4 text-sm sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-ink/60">VA Navigator care card · {day(new Date().toISOString())}</p>
        {facility && (
          <div className="mt-3">
            <p className="text-xs font-bold uppercase text-ink/60">Your VA facility</p>
            <p className="font-display text-lg font-bold">{facility.name}</p>
            {facility.address && <p>📍 {facility.address}</p>}
            {facility.phone && <p>📞 {facility.phone}</p>}
            {facility.url && <p className="break-all">🔗 {facility.url}</p>}
          </div>
        )}
        {top.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase text-ink/60">Your matched care options</p>
            <ul className="mt-1 space-y-2">
              {top.map((r) => (
                <li key={r.id} className="break-inside-avoid">
                  <p className="font-bold">{r.name}{r.distance_miles != null ? ` · ${Math.round(r.distance_miles)} mi` : ""}</p>
                  <p className="text-ink/75">{[r.kind, [r.city, r.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</p>
                  {r.phone && <p>📞 {r.phone}</p>}
                  <p className="break-all text-xs text-ink/70">{r.source_url} · verified {day(r.last_checked)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4">
          <p className="text-xs font-bold uppercase text-ink/60">Clinic hours</p>
          <p>Hours change often and aren't in our listings. Call the number above or check the facility's VA.gov page before you go.</p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold uppercase text-ink/60">Key VA numbers</p>
          <p>VA health care: 877-222-8387 (TTY: 711), Mon–Fri, 8:00 a.m.–8:00 p.m. ET</p>
          <p>Veterans Crisis Line: dial 988, then press 1 (24/7)</p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold uppercase text-ink/60">Next steps (from VA.gov)</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            {steps.map((s) => <li key={s.title} className="break-inside-avoid"><span className="font-semibold">{s.title}</span> <span className="break-all text-xs text-ink/70">{s.url}</span></li>)}
          </ol>
        </div>
        <p className="mt-4 text-xs text-ink/60">Guidance is sourced from VA documentation. VA Navigator is not liable for any approval or denial of care.</p>
      </div>
    </section>
  );
}
