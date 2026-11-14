// Guest (signed-out) allowance: care result sets per rolling 24 hours.
export const GUEST_DAILY_RESULTS = 5;
// Looser per-network cap so shared Wi-Fi (libraries, VA clinics) isn't blocked by one person.
export const GUEST_NETWORK_RESULTS = 25;
export const GUEST_TOKEN_KEY = "van_guest";

export const GUEST_LIMIT_REPLY =
  "You've used your 5 free searches for today. Sign in or create a free account to keep searching without limits. The results you already found stay on this page. If you're in crisis, call 988 and press 1, or text 838255, right now.";

/** Message shown to a guest after a result set, based on how many are left. */
export function guestNotice(remaining: number | null | undefined): string | null {
  if (remaining == null) return null;
  if (remaining === 1) return "Heads up: you have 1 free search left today. Create a free account or sign in to save your results and keep searching without limits.";
  if (remaining <= 0) return "That was your last free search for today. Create a free account or sign in to keep searching without limits.";
  return null;
}

/** A result set counts once: when it is first offered, not on every follow-up turn. */
export function countsAsGuestResult(readyToShow: boolean, crisis: boolean, alreadyOffered: boolean): boolean {
  return readyToShow && !crisis && !alreadyOffered;
}

/** Browser-only: a random id for this guest, kept across visits. Call from event handlers. */
export function guestId(): string {
  let id = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!id || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) { id = crypto.randomUUID(); localStorage.setItem(GUEST_TOKEN_KEY, id); }
  return id;
}
