import type { CareResult } from "./navigator.functions";

export type ReopenCheck = { status: "confirmed" | "unavailable" | "unconfirmed"; link: "working" | "broken" | "unchecked"; checkedAt: string };
export type RecheckedCareResult = CareResult & { reopenCheck?: ReopenCheck };

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
  return { status: link === "broken" ? "unavailable" : source, link, checkedAt };
}

export function applyReopenCheck(row: CareResult, check: ReopenCheck): RecheckedCareResult {
  return { ...row, verified: check.status === "confirmed", ...(check.status === "confirmed" ? { last_checked: check.checkedAt.slice(0, 10) } : {}), reopenCheck: check };
}