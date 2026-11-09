export type ExportCheck = {
  id: number | string; week_start: string; provider_name: string; city: string | null; state: string | null;
  homepage_status: string; redirected_to: string | null; care_status: string; care_reason: string | null;
  homepage_url: string | null; source_url: string; checked_at: string;
};
export type TrendRow = { week: string; checked: number; unavailable: number; redirects: number; unconfirmed: number };

export const homepageLabels: Record<string, string> = { working: "Website works", unavailable: "Page unavailable", unexpected_redirect: "Unexpected redirect", unconfirmed: "Could not check", no_homepage: "No website supplied" };

export function trendsFor<T extends ExportCheck>(all: T[]): TrendRow[] {
  const weeks = [...new Set(all.map((r) => r.week_start))].sort();
  return weeks.map((w) => {
    const c = all.filter((r) => r.week_start === w);
    const n = (s: string) => c.filter((r) => r.homepage_status === s).length;
    return { week: w, checked: c.length, unavailable: n("unavailable"), redirects: n("unexpected_redirect"), unconfirmed: n("unconfirmed") };
  });
}

export function rangeData<T extends ExportCheck>(all: T[], from: string, to: string) {
  const [lo, hi] = from <= to ? [from, to] : [to, from];
  const inRange = (w: string) => w >= lo && w <= hi;
  return { lo, hi, trends: trendsFor(all).filter((t) => inRange(t.week)), rows: all.filter((r) => inRange(r.week_start)) };
}

const careLabel = (s: string) => s === "listed" ? "Services listed" : s === "inactive_registration" ? "Registration deactivated - review" : "Needs confirmation";

export function csvCell(v: unknown) {
  const s = String(v ?? "").replace(/"/g, '""');
  return /^[=+\-@]/.test(s) ? `"'${s}"` : `"${s}"`;
}

export function buildCsv(data: ReturnType<typeof rangeData>) {
  const { lo, hi, trends, rows } = data;
  const line = (cells: unknown[]) => cells.map(csvCell).join(",");
  return [
    line(["Weekly community care check report", `Weeks beginning ${lo} to ${hi}`]),
    "",
    line(["Trends"]),
    line(["Week", "Providers checked", "Unavailable pages", "Unexpected redirects", "Could not check"]),
    ...trends.map((t) => line([t.week, t.checked, t.unavailable, t.redirects, t.unconfirmed])),
    "",
    line([`Results for weeks ${lo} to ${hi}`]),
    line(["Week", "Provider", "City", "State", "Website result", "Redirects to", "Care services", "Care note", "Provider website", "Official source", "Checked"]),
    ...rows.map((r) => line([r.week_start, r.provider_name, r.city, r.state, homepageLabels[r.homepage_status] ?? r.homepage_status, r.redirected_to, careLabel(r.care_status), r.care_reason, r.homepage_url, r.source_url, r.checked_at])),
  ].join("\r\n");
}
