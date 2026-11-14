import { GUEST_DAILY_RESULTS, GUEST_TOKEN_KEY } from "./guest-limit";

export const GUEST_COUNTER_KEY = "van_guest_counter";
export const GUEST_COUNTER_EVENT = "van:guest-counter";
export type GuestCounter = { remaining: number; resetAt: string | null };

/** Display-only cache. Search permissions always remain server-controlled. */
export function currentGuestCounter(saved: GuestCounter | null, now = Date.now()): GuestCounter | null {
  if (!saved) return null;
  if (saved.resetAt && new Date(saved.resetAt).getTime() <= now) return { remaining: GUEST_DAILY_RESULTS, resetAt: null };
  return { ...saved, remaining: Math.max(0, Math.min(GUEST_DAILY_RESULTS, saved.remaining)) };
}

export function readGuestCounter(): GuestCounter | null {
  try {
    const raw = localStorage.getItem(GUEST_COUNTER_KEY);
    if (raw) {
      const value = JSON.parse(raw);
      if (typeof value.remaining === "number" && Number.isFinite(value.remaining) &&
        (value.resetAt === null || (typeof value.resetAt === "string" && Number.isFinite(Date.parse(value.resetAt))))) {
        return currentGuestCounter(value);
      }
    }
    // An older guest may already have used searches before this counter existed.
    return localStorage.getItem(GUEST_TOKEN_KEY) ? null : { remaining: GUEST_DAILY_RESULTS, resetAt: null };
  } catch { return null; }
}

export function updateGuestCounter(remaining?: number | null, resetAt?: string | null): void {
  if (remaining == null || !Number.isFinite(remaining)) return;
  const value = { remaining: Math.max(0, Math.min(GUEST_DAILY_RESULTS, remaining)), resetAt: resetAt ?? null };
  try { localStorage.setItem(GUEST_COUNTER_KEY, JSON.stringify(value)); } catch { /* Storage may be disabled. */ }
  window.dispatchEvent(new CustomEvent(GUEST_COUNTER_EVENT, { detail: value }));
}