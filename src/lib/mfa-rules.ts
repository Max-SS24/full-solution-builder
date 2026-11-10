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

/** How long one emailed code stays valid (shown as a countdown). */
export const CODE_VALID_MS = 10 * 60 * 1000;
export const RESEND_WAIT_S = 60;
export const MAX_RESENDS = 5;
export const RECOVERY_CODE_COUNT = 10;
export const RECOVERY_MAX_FAILS = 5;
export const RECOVERY_LOCK_MS = 15 * 60 * 1000;

/** Seconds left on a code sent at `sentAt`; 0 means expired. */
export function secondsLeft(sentAt: number, now: number): number {
  return Math.max(0, Math.ceil((sentAt + CODE_VALID_MS - now) / 1000));
}

export function formatCountdown(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Initial send plus MAX_RESENDS more. */
export function canResend(sends: number): boolean {
  return sends <= MAX_RESENDS;
}

/** Locked when RECOVERY_MAX_FAILS failed tries happened inside the lock window. */
export function recoveryLocked(failTimes: number[], now: number): boolean {
  return failTimes.filter((t) => now - t < RECOVERY_LOCK_MS).length >= RECOVERY_MAX_FAILS;
}

/** Recovery codes look like ABCD-EFGH; compare case-insensitively without spaces/dashes. */
export function normalizeRecoveryCode(c: string): string {
  return c.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeRecoveryCode(rand: Uint8Array): string {
  const s = Array.from(rand.slice(0, 8), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
