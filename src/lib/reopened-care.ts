import type { CareResult, Variables } from "./navigator.functions";

export type ReopenCheck = { status: "confirmed" | "unavailable" | "unconfirmed"; link: "working" | "broken" | "unchecked"; checkedAt: string };
export type RecheckedCareResult = CareResult & { reopenCheck?: ReopenCheck };

export function unavailableOptions(rows: RecheckedCareResult[]) {
  return rows.filter((r) => r.reopenCheck?.status === "unavailable");
}

export function replacementCandidates(rows: CareResult[], existing: CareResult[], v: Variables) {
  const keys = new Set(existing.map((r) => `${r.source_name}|${r.id}`));
  return rows.filter((r) => {
    const va = r.kind.includes("VA") || r.kind === "Vet Center";
    return !keys.has(`${r.source_name}|${r.id}`)
      && (v.va_vs_community !== "va" || va) && (v.va_vs_community !== "community" || !va)
      && (!v.need || r.needs.includes(v.need))
      && (!v.care_type || r.care_types.includes(v.care_type))
      && (!v.care_format || r.formats.includes(v.care_format));
  }).sort((a, b) => (a.distance_miles ?? Infinity) - (b.distance_miles ?? Infinity));
}

/** Only fixed official hosts may be fetched; saved chat URLs are untrusted. */
export function officialCheckUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
    if (!["www.va.gov", "va.gov", "npiregistry.cms.hhs.gov", "findtreatment.gov", "www.findtreatment.gov"].includes(u.hostname)) return null;
    return u.href;
  } catch { return null; }
}

export function checkOutcome(source: "confirmed" | "unavailable" | "unconfirmed", link: ReopenCheck["link"], checkedAt: string): ReopenCheck {
  return { status: link === "broken" ? "unavailable" : source === "confirmed" && link === "unchecked" ? "unconfirmed" : source, link, checkedAt };
}

export function applyReopenCheck(row: CareResult, check: ReopenCheck): RecheckedCareResult {
  return { ...row, verified: check.status === "confirmed", ...(check.status === "confirmed" ? { last_checked: check.checkedAt.slice(0, 10) } : {}), reopenCheck: check };
}