import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

type Check = Tables<"community_check_history">;
const labels: Record<string, string> = { working: "Website works", unavailable: "Page unavailable", unexpected_redirect: "Unexpected redirect", unconfirmed: "Could not check", no_homepage: "No website supplied" };
function useWeeklyChecks() {
  return useQuery({ queryKey: ["weekly-community-checks"], queryFn: async () => {
    const since = new Date(Date.now() - 12 * 7 * 86400000).toISOString().slice(0, 10);
    const rows: Check[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from("community_check_history").select("*").gte("week_start", since).order("week_start", { ascending: false }).order("id").range(offset, offset + 999);
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
  return <aside role="alert" className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-l-4 border-coral bg-soft p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
    <AlertTriangle className="size-5 shrink-0" />
    <div className="min-w-0 flex-1"><p className="font-bold">Weekly community care alert · {latest}</p><p className="text-sm">{websiteIssues} website issues · {careIssues} care listings need confirmation</p></div>
    <Button variant="outline" className="col-span-2 sm:col-span-1" onClick={onOpen}>Review weekly checks</Button>
  </aside>;
}

export function WeeklyChecks() {
  const q = useWeeklyChecks();
  const [selectedWeek, setSelectedWeek] = useState("");
  const [filter, setFilter] = useState("issues");
  if (q.isPending) return <p className="mt-8" role="status">Loading weekly checks…</p>;
  if (q.isError) return <div className="mt-8"><p role="alert">Weekly checks could not be loaded.</p><Button variant="outline" onClick={() => q.refetch()}>Try again</Button></div>;
  const all = q.data;
  const weeks = [...new Set(all.map((r) => r.week_start))];
  const week = selectedWeek || weeks[0];
  const rows = all.filter((r) => r.week_start === week);
  const count = (status: string) => rows.filter((r) => r.homepage_status === status).length;
  const shown = rows.filter((r) => filter === "all" || (filter === "care" ? r.care_status !== "listed" : filter === "issues" ? ["unavailable", "unexpected_redirect", "unconfirmed"].includes(r.homepage_status) : r.homepage_status === filter));
  const trends = weeks.slice().reverse().map((w) => {
    const checks = all.filter((r) => r.week_start === w);
    return { week: w, checked: checks.length, unavailable: checks.filter((r) => r.homepage_status === "unavailable").length, redirects: checks.filter((r) => r.homepage_status === "unexpected_redirect").length, unconfirmed: checks.filter((r) => r.homepage_status === "unconfirmed").length };
  });
  const exportCsv = () => {
    const esc = (v: unknown) => { const s = String(v ?? ""); return /^[=+\-@]/.test(s) ? `"'${s.replace(/"/g, '""')}"` : `"${s.replace(/"/g, '""')}"`; };
    const lines = [
      [`Weekly community care check report`, `Week beginning ${week}`].map(esc).join(","),
      "",
      ["Trends (last 12 weeks)"].map(esc).join(","),
      ["Week", "Providers checked", "Unavailable pages", "Unexpected redirects", "Could not check"].map(esc).join(","),
      ...trends.map((t) => [t.week, t.checked, t.unavailable, t.redirects, t.unconfirmed].map(esc).join(",")),
      "",
      [`Results for week ${week}`].map(esc).join(","),
      ["Provider", "City", "State", "Website result", "Redirects to", "Care services", "Care note", "Provider website", "Official source", "Checked"].map(esc).join(","),
      ...rows.map((r) => [r.provider_name, r.city, r.state, labels[r.homepage_status] ?? r.homepage_status, r.redirected_to, r.care_status === "listed" ? "Services listed" : r.care_status === "inactive_registration" ? "Registration deactivated - review" : "Needs confirmation", r.care_reason, r.homepage_url, r.source_url, r.checked_at].map(esc).join(",")),
    ];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `weekly-community-checks-${week}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  return <section className="mt-8 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-bold">Weekly community care checks</h2><div className="flex gap-2"><Button variant="outline" onClick={exportCsv} disabled={!all.length}>Export CSV</Button><Button variant="outline" size="icon" title="Refresh weekly checks" aria-label="Refresh weekly checks" onClick={() => q.refetch()} disabled={q.isFetching}><RefreshCw /></Button></div></div>
    <p className="mt-2 text-sm text-ink/70">Sunday checks · latest attempt {all[0] ? new Date(Math.max(...rows.map((r) => Date.parse(r.checked_at)))).toLocaleString() : "not yet recorded"}</p>
    {!all.length ? <p className="mt-6">No weekly reports yet. The next Sunday checks will start the history.</p> : <>
      <div className="mt-5 flex flex-wrap items-end gap-4"><label className="text-sm font-bold">Week beginning (UTC)<select className="mt-1 block rounded-md border-2 border-ink bg-paper p-2" value={week} onChange={(e) => setSelectedWeek(e.target.value)}>{weeks.map((w) => <option key={w}>{w}</option>)}</select></label><span className="text-sm">{rows.length} providers checked so far · weekly totals may grow while Sunday checks run</span></div>
      <div className="mt-5 grid grid-cols-2 gap-4 border-y-2 border-ink py-5 sm:grid-cols-4">{[["Unavailable pages", count("unavailable")], ["Unexpected redirects", count("unexpected_redirect")], ["Could not check", count("unconfirmed")], ["Services still listed", rows.filter((r) => r.care_status === "listed").length]].map(([label, n]) => <div key={label}><p className="font-display text-3xl font-bold">{n}</p><p className="text-sm font-semibold">{label}</p></div>)}</div>
      <h3 className="mt-8 font-display text-xl font-bold">Website trends · last 12 weeks</h3>
      <div className="mt-3 h-64 w-full min-w-0 overflow-hidden"><ResponsiveContainer width="100%" height="100%"><LineChart data={trends} margin={{ top: 10, right: 15, bottom: 10, left: 0 }}><CartesianGrid stroke="var(--color-ink)" opacity={0.15} /><XAxis dataKey="week" tickFormatter={(w: string) => w.slice(5)} /><YAxis allowDecimals={false} width={35} /><Tooltip /><Line name="Unavailable pages" dataKey="unavailable" stroke="var(--color-coral)" strokeWidth={2} /><Line name="Unexpected redirects" dataKey="redirects" stroke="var(--color-mint)" strokeWidth={2} /><Line name="Could not check" dataKey="unconfirmed" stroke="var(--color-ink)" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
      <div className="flex flex-wrap gap-4 text-xs font-semibold"><span className="text-coral">● Unavailable pages</span><span className="text-mint">● Unexpected redirects</span><span>● Could not check</span></div>
      <p className="mt-4 text-sm text-ink/70">Website problems do not mean care has stopped. A directory listing confirms advertised services, not openings; active CMS registration alone cannot confirm ongoing care.</p>
      <label className="mt-6 block text-sm font-bold">Show<select aria-label="Show weekly check results" className="ml-3 rounded-md border-2 border-ink bg-paper p-2" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="issues">Website alerts</option><option value="unavailable">Unavailable pages</option><option value="unexpected_redirect">Unexpected redirects</option><option value="unconfirmed">Could not check</option><option value="care">Care needs confirmation</option><option value="all">All checked providers</option></select></label>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b-2 border-ink"><tr><th className="p-3">Provider</th><th className="p-3">Website result</th><th className="p-3">Care services</th><th className="p-3">Checked</th></tr></thead><tbody>{shown.map((r) => <tr key={r.id} className="border-b border-ink/20 align-top"><td className="max-w-64 p-3"><p className="font-bold">{r.provider_name}</p><p>{r.city}, {r.state}</p>{r.homepage_url && <a className="underline" href={r.homepage_url} target="_blank" rel="noreferrer">Provider website ↗</a>}<a className="mt-1 block underline" href={r.source_url} target="_blank" rel="noreferrer">Official source ↗</a></td><td className="p-3"><p className="font-semibold">{labels[r.homepage_status]}</p>{r.redirected_to && <p className="max-w-48 break-words">Redirects to {r.redirected_to}</p>}</td><td className="max-w-80 p-3"><p className="font-semibold">{r.care_status === "listed" ? "Services listed" : r.care_status === "inactive_registration" ? "Registration deactivated — review" : "Needs confirmation"}</p><p className="mt-1 text-ink/70">{r.care_reason}</p></td><td className="p-3">{new Date(r.checked_at).toLocaleString()}</td></tr>)}{!shown.length && <tr><td colSpan={4} className="p-4">No checks match this filter.</td></tr>}</tbody></table></div>
    </>}
  </section>;
}