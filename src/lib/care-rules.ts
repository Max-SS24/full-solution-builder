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
