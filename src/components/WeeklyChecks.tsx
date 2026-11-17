import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recheckFailed, FAILED_HOMEPAGE } from "@/lib/weekly-recheck.functions";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { buildCsv, rangeData } from "@/lib/weekly-export";

type Check = Tables<"community_check_history"> & { care_options?: { last_validated: string; homepage_check: unknown } | null };
const reasonOf = (r: Check) => r.care_status !== "listed" && !FAILED_HOMEPAGE.includes(r.homepage_status) ? "care" : r.homepage_status;
const labels: Record<string, string> = { working: "Website works", unavailable: "Page unavailable", unexpected_redirect: "Unexpected redirect", unconfirmed: "Could not check", no_homepage: "No website supplied" };
/** Latest saved website detail (e.g. firewall block), shown only when it describes this row's result. */
function siteNote(r: Check) {
  const c = r.care_options?.homepage_check as { url?: string; status?: string; reason?: string } | null | undefined;
  return r.homepage_status !== "working" && c?.reason && c.url === r.homepage_url && c.status === r.homepage_status ? c.reason : "";
}
function useWeeklyChecks() {
  return useQuery({ queryKey: ["weekly-community-checks"], queryFn: async () => {
    const since = new Date(Date.now() - 12 * 7 * 86400000).toISOString().slice(0, 10);
    const rows: Check[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from("community_check_history").select("*, care_options(last_validated, homepage_check)").gte("week_start", since).order("week_start", { ascending: false }).order("id").range(offset, offset + 999);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 1000) break;
    }
    return rows;
  }, refetchInterval: 60000 });
}

export function WeeklyCheckAlert({ onOpen }: { onOpen: () => void }) {
  const q = useWeeklyChecks();
  const latest = q.data?.[0]?.week_start;
  const rows = q.data?.filter((r) => r.week_start === latest) ?? [];
  const websiteIssues = rows.filter((r) => ["unavailable", "unexpected_redirect", "unconfirmed"].includes(r.homepage_status)).length;
  const careIssues = rows.filter((r) => r.care_status !== "listed").length;
  if (!websiteIssues && !careIssues) return null;
  return <div role="alert" className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-l-4 border-coral bg-soft p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
    <AlertTriangle className="size-5 shrink-0" />
    <div className="min-w-0 flex-1"><p className="font-bold">Weekly community care alert · {latest}</p><p className="text-sm">{websiteIssues} website issues · {careIssues} care listings need confirmation</p></div>
    <Button variant="outline" className="col-span-2 sm:col-span-1" onClick={onOpen}>Review weekly checks</Button>
  </div>;
}

export function WeeklyChecks({ focusSignal = 0 }: { focusSignal?: number }) {
  const q = useWeeklyChecks();
  const listRef = useRef<HTMLHeadingElement>(null);
  const recheck = useServerFn(recheckFailed);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!focusSignal) return;
    setSelectedWeek(""); setFilter("issues");
    const t = setTimeout(() => { listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); listRef.current?.focus(); }, 50);
    return () => clearTimeout(t);
  }, [focusSignal, q.isPending]);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [filter, setFilter] = useState("issues");
  const [fromWeek, setFromWeek] = useState("");
  const [toWeek, setToWeek] = useState("");
  const [reason, setReason] = useState("any");
  const [recheckState, setRecheckState] = useState("any");
  const [sortBy, setSortBy] = useState("reason");
  if (q.isPending) return <p className="mt-8" role="status">Loading weekly checks…</p>;
  if (q.isError) return <div className="mt-8"><p role="alert">Weekly checks could not be loaded.</p><Button variant="outline" onClick={() => q.refetch()}>Try again</Button></div>;
  const all = q.data;
  const weeks = [...new Set(all.map((r) => r.week_start))];
  const week = selectedWeek || weeks[0];
  const rows = all.filter((r) => r.week_start === week);
  const count = (status: string) => rows.filter((r) => r.homepage_status === status).length;
  const shown = rows.filter((r) => filter === "all" || (filter === "care" ? r.care_status !== "listed" : filter === "issues" ? ["unavailable", "unexpected_redirect", "unconfirmed"].includes(r.homepage_status) : r.homepage_status === filter))
    .filter((r) => reason === "any" || reasonOf(r) === reason)
    .filter((r) => recheckState === "any" || (recheckState === "rechecked" ? !!r.deep_checked_at : recheckState === "recovered" ? !!r.deep_checked_at && !FAILED_HOMEPAGE.includes(r.homepage_status) : !r.deep_checked_at))
    .sort((a, b) => {
      const lv = (r: Check) => r.care_options?.last_validated ? Date.parse(r.care_options.last_validated) : 0;
      const dc = (r: Check) => r.deep_checked_at ? Date.parse(r.deep_checked_at) : 0;
      if (sortBy === "verified_old") return lv(a) - lv(b);
      if (sortBy === "verified_new") return lv(b) - lv(a);
      if (sortBy === "recheck") return dc(b) - dc(a);
      return reasonOf(a).localeCompare(reasonOf(b)) || a.provider_name.localeCompare(b.provider_name);
    });
  const trends = weeks.slice().reverse().map((w) => {
    const checks = all.filter((r) => r.week_start === w);
    return { week: w, checked: checks.length, unavailable: checks.filter((r) => r.homepage_status === "unavailable").length, redirects: checks.filter((r) => r.homepage_status === "unexpected_redirect").length, unconfirmed: checks.filter((r) => r.homepage_status === "unconfirmed").length };
  });
  const from = fromWeek || weeks[weeks.length - 1] || "";
  const to = toWeek || weeks[0] || "";
  const range = rangeData(all, from, to);
  const { lo, hi, trends: rangeTrends, rows: rangeRows } = range;
  const failed = (r: Check) => FAILED_HOMEPAGE.includes(r.homepage_status) || r.care_status !== "listed";
  const pendingFailed = rows.filter((r) => failed(r) && !r.deep_checked_at).length;
  const runRecheck = async (ids?: string[]) => {
    setBusy(ids?.[0] ?? "all"); setNote(ids ? "Running a deep recheck…" : "Running deep rechecks (up to 25 at a time)…");
    try {
      const res = await recheck({ data: { week, ids } });
      await q.refetch();
      const left = ids ? 0 : Math.max(0, pendingFailed - res.processed);
      setNote(res.processed ? `Deep recheck finished for ${res.processed} provider${res.processed === 1 ? "" : "s"}.${left ? ` ${left} more to go — click again to continue.` : ""}` : "No failed checks left to recheck for this week.");
    } catch { setNote("The deep recheck could not run. Please try again."); }
    finally { setBusy(null); }
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob(["\uFEFF" + buildCsv(range)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `weekly-community-checks-${lo}_to_${hi}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  return <section className="mt-8 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-bold">Weekly community care checks</h2><div className="flex gap-2"><Button variant="outline" onClick={exportCsv} disabled={!all.length}>Export CSV</Button><Button variant="outline" size="icon" title="Refresh weekly checks" aria-label="Refresh weekly checks" onClick={() => q.refetch()} disabled={q.isFetching}><RefreshCw /></Button></div></div>
    <p className="mt-2 text-sm text-ink/70">Sunday checks · latest attempt {all[0] ? new Date(Math.max(...rows.map((r) => Date.parse(r.checked_at)))).toLocaleString() : "not yet recorded"}</p>
    {!all.length ? <p className="mt-6">No weekly reports yet. The next Sunday checks will start the history.</p> : <>
      <div className="mt-5 flex flex-wrap items-end gap-4"><label className="text-sm font-bold">Week beginning (UTC)<select className="mt-1 block rounded-md border-2 border-ink bg-paper p-2" value={week} onChange={(e) => setSelectedWeek(e.target.value)}>{weeks.map((w) => <option key={w}>{w}</option>)}</select></label><span className="text-sm">{rows.length} providers checked so far · weekly totals may grow while Sunday checks run</span></div>
      <fieldset className="mt-4 flex flex-wrap items-end gap-4"><legend className="text-sm font-bold">Export date range</legend><label className="text-sm">From week<select aria-label="Export from week" className="mt-1 block rounded-md border-2 border-ink bg-paper p-2" value={from} onChange={(e) => setFromWeek(e.target.value)}>{weeks.map((w) => <option key={w}>{w}</option>)}</select></label><label className="text-sm">To week<select aria-label="Export to week" className="mt-1 block rounded-md border-2 border-ink bg-paper p-2" value={to} onChange={(e) => setToWeek(e.target.value)}>{weeks.map((w) => <option key={w}>{w}</option>)}</select></label></fieldset>
      <details className="mt-4 rounded-md border-2 border-ink p-4" open>
        <summary className="cursor-pointer font-bold">Export preview · {lo} to {hi} · {rangeTrends.length} weeks · {rangeRows.length} provider checks</summary>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-b-2 border-ink"><tr><th className="p-2">Week</th><th className="p-2">Providers checked</th><th className="p-2">Unavailable pages</th><th className="p-2">Unexpected redirects</th><th className="p-2">Could not check</th></tr></thead><tbody>{rangeTrends.map((t) => <tr key={t.week} className="border-b border-ink/20"><td className="p-2">{t.week}</td><td className="p-2">{t.checked}</td><td className="p-2">{t.unavailable}</td><td className="p-2">{t.redirects}</td><td className="p-2">{t.unconfirmed}</td></tr>)}</tbody></table></div>
        <p className="mt-4 text-sm font-bold">Results{rangeRows.length > 10 ? ` · first 10 of ${rangeRows.length}` : ""}</p>
        <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b-2 border-ink"><tr><th className="p-2">Week</th><th className="p-2">Provider</th><th className="p-2">Website result</th><th className="p-2">Care services</th></tr></thead><tbody>{rangeRows.slice(0, 10).map((r) => <tr key={r.id} className="border-b border-ink/20"><td className="p-2">{r.week_start}</td><td className="p-2">{r.provider_name} · {r.city}, {r.state}</td><td className="p-2">{labels[r.homepage_status] ?? r.homepage_status}</td><td className="p-2">{r.care_status === "listed" ? "Services listed" : r.care_status === "inactive_registration" ? "Registration deactivated — review" : "Needs confirmation"}</td></tr>)}{!rangeRows.length && <tr><td colSpan={4} className="p-2">No checks in this range.</td></tr>}</tbody></table></div>
        <Button className="mt-4" onClick={exportCsv} disabled={!rangeRows.length}>Download this CSV</Button>
      </details>
      <div className="mt-5 grid grid-cols-2 gap-4 border-y-2 border-ink py-5 sm:grid-cols-4">{[["Unavailable pages", count("unavailable")], ["Unexpected redirects", count("unexpected_redirect")], ["Could not check", count("unconfirmed")], ["Services still listed", rows.filter((r) => r.care_status === "listed").length]].map(([label, n]) => <div key={label}><p className="font-display text-3xl font-bold">{n}</p><p className="text-sm font-semibold">{label}</p></div>)}</div>
      <h3 className="mt-8 font-display text-xl font-bold">Website trends · last 12 weeks</h3>
      <div className="mt-3 h-64 w-full min-w-0 overflow-hidden"><ResponsiveContainer width="100%" height="100%"><LineChart data={trends} margin={{ top: 10, right: 15, bottom: 10, left: 0 }}><CartesianGrid stroke="var(--color-ink)" opacity={0.15} /><XAxis dataKey="week" tickFormatter={(w: string) => w.slice(5)} /><YAxis allowDecimals={false} width={35} /><Tooltip /><Line name="Unavailable pages" dataKey="unavailable" stroke="var(--color-coral)" strokeWidth={2} /><Line name="Unexpected redirects" dataKey="redirects" stroke="var(--color-mint)" strokeWidth={2} /><Line name="Could not check" dataKey="unconfirmed" stroke="var(--color-ink)" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
      <div className="flex flex-wrap gap-4 text-xs font-semibold"><span className="text-coral">● Unavailable pages</span><span className="text-mint">● Unexpected redirects</span><span>● Could not check</span></div>
      <p className="mt-4 text-sm text-ink/70">Website problems do not mean care has stopped. A directory listing confirms advertised services, not openings; active CMS registration alone cannot confirm ongoing care.</p>
      <div className="mt-6 flex flex-wrap items-center gap-3"><h3 ref={listRef} tabIndex={-1} className="font-display text-xl font-bold outline-none focus-visible:ring-2">Check results · {shown.length} shown</h3><Button onClick={() => runRecheck()} disabled={!!busy || !pendingFailed}>{busy === "all" ? "Rechecking…" : `Recheck failed (${pendingFailed})`}</Button></div>
      <p role="status" aria-live="polite" className="mt-2 text-sm">{note}</p>
      <label className="mt-4 block text-sm font-bold">Show<select aria-label="Show weekly check results" className="ml-3 rounded-md border-2 border-ink bg-paper p-2" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="issues">Website alerts</option><option value="unavailable">Unavailable pages</option><option value="unexpected_redirect">Unexpected redirects</option><option value="unconfirmed">Could not check</option><option value="care">Care needs confirmation</option><option value="all">All checked providers</option></select></label>
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="text-sm font-bold">Failure reason<select aria-label="Filter by failure reason" className="ml-2 rounded-md border-2 border-ink bg-paper p-2" value={reason} onChange={(e) => setReason(e.target.value)}><option value="any">Any reason</option><option value="unavailable">Page unavailable</option><option value="unexpected_redirect">Unexpected redirect</option><option value="unconfirmed">Could not check</option><option value="care">Care needs confirmation only</option><option value="working">Website works</option><option value="no_homepage">No website supplied</option></select></label>
        <label className="text-sm font-bold">Recheck status<select aria-label="Filter by recheck status" className="ml-2 rounded-md border-2 border-ink bg-paper p-2" value={recheckState} onChange={(e) => setRecheckState(e.target.value)}><option value="any">Any</option><option value="not_rechecked">Not rechecked yet</option><option value="rechecked">Rechecked (deep)</option><option value="recovered">Recovered after recheck</option></select></label>
        <label className="text-sm font-bold">Sort by<select aria-label="Sort weekly check results" className="ml-2 rounded-md border-2 border-ink bg-paper p-2" value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="reason">Failure reason</option><option value="verified_old">Last verified (oldest first)</option><option value="verified_new">Last verified (newest first)</option><option value="recheck">Most recently rechecked</option></select></label>
      </div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b-2 border-ink"><tr><th className="p-3">Provider</th><th className="p-3">Website result</th><th className="p-3">Care services</th><th className="p-3">Last verified</th><th className="p-3">Checked</th></tr></thead><tbody>{shown.map((r) => <tr key={r.id} className="border-b border-ink/20 align-top"><td className="max-w-64 p-3"><p className="font-bold">{r.provider_name}</p><p>{r.city}, {r.state}</p>{r.homepage_url && <a className="underline" href={r.homepage_url} target="_blank" rel="noreferrer">Provider website<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span></a>}<a className="mt-1 block underline" href={r.source_url} target="_blank" rel="noreferrer">Official source<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span></a></td><td className="p-3"><p className="font-semibold">{labels[r.homepage_status]}</p>{r.redirected_to && <p className="max-w-48 break-words">Redirects to {r.redirected_to}</p>}{siteNote(r) && <p className="mt-1 max-w-56 text-ink/70">{siteNote(r)}</p>}</td><td className="max-w-80 p-3"><p className="font-semibold">{r.care_status === "listed" ? "Services listed" : r.care_status === "inactive_registration" ? "Registration deactivated — review" : "Needs confirmation"}</p><p className="mt-1 text-ink/70">{r.care_reason}</p></td><td className="p-3">{r.care_options?.last_validated ? new Date(r.care_options.last_validated).toLocaleDateString() : "Not recorded"}</td><td className="p-3"><p>{new Date(r.checked_at).toLocaleString()}</p>{r.deep_checked_at && <p className="mt-1 text-xs"><span className="font-bold">Rechecked (deep)</span> {new Date(r.deep_checked_at).toLocaleString()}<br />{r.deep_reason}</p>}{failed(r) && <Button size="sm" variant="outline" className="mt-2" disabled={!!busy} onClick={() => runRecheck([r.id])} aria-label={`Deep recheck ${r.provider_name}`}>{busy === r.id ? "Rechecking…" : "Recheck"}</Button>}</td></tr>)}{!shown.length && <tr><td colSpan={5} className="p-4">No checks match this filter.</td></tr>}</tbody></table></div>
    </>}
  </section>;
}