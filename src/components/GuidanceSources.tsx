import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PREP_FACTS } from "@/lib/appointment-prep";

type Row = { fact_id: string; ok: boolean; http_status: number | null; checked_at: string };

export function GuidanceSources() {
  const [rows, setRows] = useState<Record<string, Row>>({});
  useEffect(() => {
    supabase.from("prep_fact_checks").select("fact_id, ok, http_status, checked_at")
      .then(({ data }) => setRows(Object.fromEntries((data ?? []).map((r) => [r.fact_id, r]))));
  }, []);
  return (
    <section className="mt-8 rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard">
      <h2 className="font-display text-2xl font-bold">Guidance sources</h2>
      <p className="mt-1 text-sm text-ink/70">Each appointment-prep fact is re-checked against its VA.gov page every Sunday and when people open it. A failed fact is hidden until its wording is reviewed.</p>
      <ul className="mt-4 divide-y-2 divide-ink/10 text-sm">
        {PREP_FACTS.map((f) => {
          const r = rows[f.id];
          return (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold underline">{f.id} · {f.sourceLabel}</a>
              <span className={`font-bold ${r && !r.ok ? "text-coral" : "text-ink/70"}`}>
                {!r ? "Not checked yet" : r.ok ? `✓ Confirmed ${new Date(r.checked_at).toLocaleString()}` : `Needs review (status ${r.http_status ?? "unreachable"}) · ${new Date(r.checked_at).toLocaleString()}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
