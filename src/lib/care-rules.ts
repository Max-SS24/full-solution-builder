// Pure business rules shared by analytics and the weekly care-option check.
import type { CareResult } from "./navigator.functions";

export const ACTIVE_WINDOW_DAYS = 30;

/** A user is "active" when they signed in within the last 30 days. */
export function isActiveUser(lastSignIn: string | Date | null, now: Date = new Date()): boolean {
  if (!lastSignIn) return false;
  const t = new Date(lastSignIn).getTime();
  return now.getTime() - t <= ACTIVE_WINDOW_DAYS * 86_400_000;
}

export type OptionStatus = "active" | "needs_review" | "removed";

/** Weekly check: found → active; first miss → needs_review; second miss in a row → removed. */
export function nextStatus(found: boolean, current: OptionStatus): OptionStatus {
  if (found) return "active";
  return current === "active" ? "needs_review" : "removed";
}

export const isVaKind = (kind: string) => kind.includes("VA") || kind === "Vet Center";

export type CareOptionRow = {
  source_id: string; external_id: string; name: string; kind: string; city: string | null; state: string | null;
  va_vs_community: "va" | "community"; insurance: string[]; formats: string[]; needs: string[]; care_types: string[];
  veteran_focus: boolean; phone: string | null; website: string; bio: string | null;
};

export function toOptionRow(r: CareResult, sourceId: string): CareOptionRow {
  return {
    source_id: sourceId, external_id: r.id, name: r.name, kind: r.kind, city: r.city, state: r.state,
    va_vs_community: isVaKind(r.kind) ? "va" : "community", insurance: r.payment, formats: r.formats, needs: r.needs,
    care_types: r.care_types, veteran_focus: r.veteran_focus, phone: r.phone, website: r.source_url, bio: r.bio ?? null,
  };
}

/** Straight-line miles between two points (haversine). */
export function milesBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 3958.8, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest first; listings without a known distance go last. */
export function sortByDistance<T extends { distance_miles?: number | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.distance_miles ?? Infinity) - (b.distance_miles ?? Infinity));
}

export type ReviewReason = "page_missing" | "contact_changed" | null;
export const CONTACT_FLAG_DAYS = 7;

/** Why a VA listing needs review: page missing wins; changed contact details stay flagged for a week. */
export function reviewReason(status: string, contactChangedAt: string | null, now: Date = new Date()): ReviewReason {
  if (status === "needs_review") return "page_missing";
  if (contactChangedAt && now.getTime() - new Date(contactChangedAt).getTime() <= CONTACT_FLAG_DAYS * 86_400_000) return "contact_changed";
  return null;
}

/** VA.gov facility / Vet Center page URLs in a sitemap that aren't saved yet. */
export function newFacilityUrls(sitemapXml: string, known: Set<string>): string[] {
  const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.trim().replace(/\/?$/, "/"));
  return [...new Set(urls)].filter((u) => /^https:\/\/www\.va\.gov\/[^/]+\/locations\/[^/]+\/$/.test(u) && !known.has(u));
}
