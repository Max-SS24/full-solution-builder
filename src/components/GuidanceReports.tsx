import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { REPORT_REASONS } from "@/lib/guidance-reports";

export function GuidanceReports() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["guidance-reports"], queryFn: async () => {
    const { data, error } = await supabase.from("appointment_guidance_reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  } });
  async function review(id: string, resolved: boolean) {
    setBusy(id); setError("");
    try {
      const { data, error } = await supabase.from("appointment_guidance_reports").update({ resolved_at: resolved ? null : new Date().toISOString() }).eq("id", id).select("id").single();
      if (error || !data) throw new Error("Review couldn't be saved.");
      await q.refetch();
    } catch { setError("Review couldn't be saved. Please try again."); }
    finally { setBusy(null); }
  }
  return <section className="mt-8 border-t-2 border-ink/20 pt-6">
    <h2 className="font-display text-2xl font-bold">Guidance reports</h2>
    <p className="mt-1 text-sm text-ink/70">Latest 100 reports. Marking a report reviewed does not change guidance or its verification status.</p>
    {q.isPending && <p role="status">Loading reports…</p>}
    {(q.isError || error) && <p role="alert">{error || "Reports couldn't be loaded."}</p>}
    <Button variant="outline" className="mt-3" onClick={() => q.refetch()} disabled={q.isFetching}>Refresh reports</Button>
    {q.data?.length === 0 && <p className="mt-4">No guidance reports yet.</p>}
    <ul className="mt-4 divide-y-2 divide-ink/10">{q.data?.map((r) => <li key={r.id} className="grid gap-2 py-4">
      <p className="text-sm font-semibold">{REPORT_REASONS[r.reason as keyof typeof REPORT_REASONS] ?? r.reason} · {r.resolved_at ? "Reviewed" : "Needs review"}</p>
      <p className="text-xs text-ink/70">{r.fact_id} · Received {new Date(r.created_at).toLocaleString()}{r.resolved_at && ` · Reviewed ${new Date(r.resolved_at).toLocaleString()}`}</p>
      <p>{r.finding}</p>
      {r.details && <p className="whitespace-pre-wrap break-words text-sm">{r.details}</p>}
      <a href={r.source_url} target="_blank" rel="noreferrer" className="break-all text-sm underline">VA.gov source<span className="sr-only"> (opens in a new tab)</span></a>
      <Button variant="outline" className="justify-self-start" disabled={busy === r.id} onClick={() => review(r.id, Boolean(r.resolved_at))}>{busy === r.id ? "Saving…" : r.resolved_at ? "Reopen report" : "Mark reviewed"}</Button>
    </li>)}</ul>
  </section>;
}