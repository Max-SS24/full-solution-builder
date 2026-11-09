/** A password sign-in must be followed by the emailed code within this window. */
export const PROOF_WINDOW_MS = 10 * 60 * 1000;
export const MAX_CODE_TRIES = 5;

type Amr = { method?: string; timestamp?: number };

export function amrMethods(amr: unknown): string[] {
  return Array.isArray(amr) ? (amr as Amr[]).map((a) => String(a?.method ?? "")) : [];
}

/** True when the session came from an emailed code (or link) entered within the window. */
export function recentCode(amr: unknown, now: number): boolean {
  if (!Array.isArray(amr)) return false;
  return (amr as Amr[]).some((a) => (a?.method === "otp" || a?.method === "magiclink") && typeof a.timestamp === "number" && now - a.timestamp * 1000 <= PROOF_WINDOW_MS);
}
