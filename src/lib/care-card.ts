import type { CareResult } from "./navigator.functions";

export function cardAddress(result: CareResult): string | null {
  return result.bio?.match(/^(.+?\d{5}(?:-\d{4})?)\./)?.[1] ?? null;
}

/** Do not turn saved or failed checks into an unconditional verification claim. */
export function cardStatus(result: CareResult & { reopenCheck?: { status: string } }): string {
  if (result.reopenCheck?.status === "unavailable") return "Unavailable — search for current options";
  if (result.reopenCheck?.status === "unconfirmed" || !result.verified || result.review === "page_missing") return "Needs review — call to confirm";
  if (result.review === "contact_changed") return "Contact details changed — call to confirm";
  return "Source listing checked — call to confirm availability";
}