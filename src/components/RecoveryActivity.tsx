import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { recoveryHistory } from "@/lib/mfa.functions";
import { recoveryEventLabel } from "@/lib/recovery-notice";
import { downloadCsv, recoveryHistoryCsv, recoveryTotals, recoveryTrendsCsv, type RecoveryDay } from "@/lib/activity-reports";

export function PersonalRecoveryActivity() {
  const fetchHistory = useServerFn(recoveryHistory);
  const q = useQuery({ queryKey: ["recovery-activity"], queryFn: () => fetchHistory() });
  return <div className="mt-5 border-t-2 border-ink/15 pt-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-bold">Recovery code activity</h3>
      <Button variant="outline" disabled={!q.data?.events.length || q.isFetching} onClick={() => downloadCsv(recoveryHistoryCsv(q.data?.events ?? []), "recovery-code-activity.csv")}><Download />Export activity CSV</Button>
    </div>
    {q.isPending ? <p role="status" className="mt-2 text-sm">Loading activity…</p> : q.isError ? <div className="mt-2"><p role="alert">Couldn’t load recovery activity.</p><Button variant="outline" onClick={() => q.refetch()}>Try again</Button></div> : !q.data.events.length ? <p className="mt-2 text-sm">No activity yet.</p> : <>
      <p className="mt-2 text-xs text-ink/60">{q.data.events.length} events · newest first</p>
      <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto text-sm" aria-label="Recovery code activity">{q.data.events.map((e, i) => <li key={i} className="flex flex-wrap justify-between gap-2 rounded-lg bg-cream px-2 py-1"><span className="font-semibold">{recoveryEventLabel(e.kind)}</span><time dateTime={e.at}>{new Date(e.at).toLocaleString()}</time></li>)}</ul>
    </>}
  </div>;
}

export function RecoveryTrends({ days, reportedAt, refresh, refreshing }: { days: RecoveryDay[]; reportedAt: string; refresh: () => void; refreshing: boolean }) {
  const [period, setPeriod] = useState("30");
  const rows = days.slice(-Number(period));
  const totals = recoveryTotals(rows);
  return <section className="mt-8 min-w-0 border-t-2 border-ink pt-6" aria-label="Recovery-code analytics">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-bold">Recovery-code activity</h2><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!rows.length} onClick={() => downloadCsv(recoveryTrendsCsv(rows, reportedAt), `recovery-trends-${rows[0]?.day}_to_${rows.at(-1)?.day}.csv`)}><Download />Export recovery trends CSV</Button><Button variant="outline" size="icon" aria-label="Refresh analytics" title="Refresh analytics" onClick={refresh} disabled={refreshing}><RefreshCw /></Button></div></div>
    <label className="mt-4 block text-sm font-semibold">Period<select aria-label="Recovery chart period" className="ml-3 rounded-md border-2 border-ink bg-paper p-2" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
    <p className="mt-2 text-xs text-ink/60">{rows[0]?.day} to {rows.at(-1)?.day} · UTC · updated {new Date(reportedAt).toLocaleString()}</p>
    <div className="mt-4 grid grid-cols-1 gap-4 border-y-2 border-ink/20 py-4 sm:grid-cols-3">{[["Sign-ins", totals.sign_in], ["Revocations", totals.revoked], ["Code sets generated", totals.regenerated]].map(([label, n]) => <div key={label}><p className="font-display text-3xl font-bold">{n}</p><p className="text-sm font-semibold">{label}</p></div>)}</div>
    <div className="mt-4 h-72 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 12, right: 16, left: 0, bottom: 10 }}><CartesianGrid stroke="var(--color-ink)" opacity={0.15} /><XAxis dataKey="day" tickFormatter={(s: string) => s.slice(5)} minTickGap={28} /><YAxis allowDecimals={false} width={35} /><Tooltip /><Line name="Sign-ins" dataKey="sign_in" stroke="var(--color-mint)" strokeWidth={2} isAnimationActive={false} /><Line name="Revocations" dataKey="revoked" stroke="var(--color-coral)" strokeWidth={2} isAnimationActive={false} /><Line name="Code sets generated" dataKey="regenerated" stroke="var(--color-ink)" strokeWidth={2} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
    <div className="flex flex-wrap gap-4 text-xs font-semibold"><span className="text-mint">● Sign-ins</span><span className="text-coral">● Revocations</span><span>● Code sets generated</span></div>
    {!Object.values(totals).some(Boolean) && <p className="mt-3 text-sm">No recovery-code activity in this period.</p>}
    <details className="mt-4"><summary className="cursor-pointer text-sm font-bold">Daily totals</summary><div className="mt-2 overflow-x-auto"><table className="w-full min-w-[440px] text-left text-sm"><thead><tr>{["Date (UTC)", "Sign-ins", "Revocations", "Code sets generated"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.day} className="border-t border-ink/15"><td className="p-2">{r.day}</td><td className="p-2">{r.sign_in}</td><td className="p-2">{r.revoked}</td><td className="p-2">{r.regenerated}</td></tr>)}</tbody></table></div></details>
  </section>;
}