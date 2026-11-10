import { csvCell } from "./weekly-export";

export type RecoveryEvent = { kind: string; at: string };
export type RecoveryDay = { day: string; sign_in: number; revoked: number; regenerated: number };
export type AnalyticsStats = {
  total_users: number; active_users: number; new_7d: number; new_30d: number;
  searches_total: number; searches_7d: number; users_with_prefs: number;
  care_options: number; care_options_review: number;
  top_needs: { label: string; count: number }[];
  top_locations: { label: string; count: number }[];
  recovery_daily: RecoveryDay[]; reported_at: string;
};
export function reportCsv(rows: unknown[][]) {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
export function recoveryHistoryCsv(events: RecoveryEvent[]) {
  return reportCsv([["Event type", "Timestamp (UTC)"], ...events.map((e) => [e.kind, new Date(e.at).toISOString()])]);
}
export function recoveryTotals(rows: RecoveryDay[]) {
  return rows.reduce((sum, r) => ({ sign_in: sum.sign_in + r.sign_in, revoked: sum.revoked + r.revoked, regenerated: sum.regenerated + r.regenerated }), { sign_in: 0, revoked: 0, regenerated: 0 });
}
export function recoveryTrendsCsv(rows: RecoveryDay[], reportedAt: string) {
  return reportCsv([["Date (UTC)", "Recovery-code sign-ins", "Revocations", "Code sets generated", "Report timestamp (UTC)"], ...rows.map((r) => [r.day, r.sign_in, r.revoked, r.regenerated, reportedAt])]);
}
export function analyticsCsv(d: AnalyticsStats) {
  const metrics = {
    "Registered users": d.total_users, "Active users (30 days)": d.active_users,
    "Inactive users": d.total_users - d.active_users, "New sign-ups (7 days)": d.new_7d,
    "New sign-ups (30 days)": d.new_30d, "Saved searches": d.searches_total,
    "Searches (7 days)": d.searches_7d, "Users with saved preferences": d.users_with_prefs,
    "Care options on file": d.care_options, "Options needing review": d.care_options_review,
  };
  return reportCsv([["Category", "Metric", "Count", "Report timestamp (UTC)"],
    ...Object.entries(metrics).map(([k, v]) => ["Summary", k, v, d.reported_at]),
    ...d.top_needs.map((r) => ["Most requested needs", r.label, r.count, d.reported_at]),
    ...d.top_locations.map((r) => ["Most searched locations", r.label, r.count, d.reported_at])]);
}
export function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}