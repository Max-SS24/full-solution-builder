// Pure helpers for how a result card links to and names its source.
type SourceInfo = { id: string; source_url: string | null | undefined; source_name: string | null | undefined };

/** Link for "View original source", or null when the listing has none (never an empty href). */
export function sourceLinkFor(r: SourceInfo): string | null {
  const name = (r.source_name ?? "").toLowerCase();
  if (name.includes("findtreatment") || r.id.startsWith("ft-")) return "https://findtreatment.gov/locator";
  const url = (r.source_url ?? "").trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

/** Name of where a listing was last verified, VA.gov only for VA.gov pages. */
export function verifiedSourceLabel(r: SourceInfo): string {
  return /(^|\.|\/\/)va\.gov(\/|$)/i.test(r.source_url ?? "") ? "VA.gov" : (r.source_name || "its source");
}

/** Saved account preferences win over this session's questionnaire answers. */
export function mergeSearchPrefs(quiz: Record<string, unknown>, saved: Record<string, unknown> | null | undefined) {
  return { ...quiz, ...(saved ?? {}) };
}

/** A crisis message without a location never shows results from a default area. */
export function crisisSafe<T>(crisis: boolean, locationGiven: boolean, results: T[]): T[] {
  return crisis && !locationGiven ? [] : results;
}
