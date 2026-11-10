/** Formats VA.gov schema.org openingHoursSpecification into a short line, e.g. "Mon–Fri 7:30 AM–4:00 PM · Sat–Sun Closed". */
export const HOURS_NOTICE = "Hours may not be accurate — call or check the VA.gov page before you go.";

type Spec = { dayOfWeek?: string | string[]; opens?: string; closes?: string };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function t(v: string) {
  const [h, m] = v.split(":").map(Number);
  if (h === undefined || Number.isNaN(h)) return v;
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m ?? 0).padStart(2, "0")} ${ap}`;
}

export function formatHours(specs: unknown): string | null {
  if (!Array.isArray(specs)) return null;
  const byDay = new Map<number, string>();
  for (const s of specs as Spec[]) {
    const days = Array.isArray(s.dayOfWeek) ? s.dayOfWeek : [s.dayOfWeek ?? ""];
    for (const d of days) {
      const i = DAYS.findIndex((n) => d.endsWith(n));
      if (i < 0) continue;
      const o = (s.opens ?? "").trim(), c = (s.closes ?? "").trim();
      byDay.set(i, !o || !c ? "Closed" : o.startsWith("00:00") && (c.startsWith("23:59") || c.startsWith("00:00")) ? "24 hours" : `${t(o)}–${t(c)}`);
    }
  }
  if (!byDay.size || [...byDay.values()].every((v) => v === "Closed")) return null;
  const parts: string[] = [];
  let i = 0;
  while (i < 7) {
    const v = byDay.get(i);
    if (v === undefined) { i++; continue; }
    let j = i;
    while (j + 1 < 7 && byDay.get(j + 1) === v) j++;
    const name = (k: number) => DAYS[k]!.slice(0, 3);
    parts.push(`${i === j ? name(i) : `${name(i)}–${name(j)}`} ${v}`);
    i = j + 1;
  }
  return parts.join(" · ");
}
