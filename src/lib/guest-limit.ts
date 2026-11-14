// Guest (signed-out) allowance: care result sets per rolling 24 hours.
export const GUEST_DAILY_RESULTS = 5;
// Looser per-network cap so shared Wi-Fi (libraries, VA clinics) isn't blocked by one person.
export const GUEST_NETWORK_RESULTS = 25;
export const GUEST_TOKEN_KEY = "van_guest";

export const GUEST_LIMIT_REPLY: string =
  "You've used your 5 free searches for today. Sign in or create a free account to keep searching without limits. The results you already found stay on this page. If you're in crisis, call 988 and press 1, or text 838255, right now.";

/** Message shown to a guest after a result set, based on how many are left. */
export function guestNotice(remaining: number | null | undefined, resetAt?: string | null): string | null {
  if (remaining == null) return null;
  const when = resetText(resetAt);
  if (remaining === 1) return `Heads up: you have 1 free search left today.${when ? ` Your 5 free searches come back ${when}.` : ""} Create a free account or sign in to save your results and keep searching without limits.`;
  if (remaining <= 0) return `That was your last free search for today.${when ? ` Your free searches come back ${when}.` : ""} Create a free account or sign in to keep searching without limits.`;
  return null;
}

/** Message when a guest is already at the limit. */
export function guestLimitReply(resetAt?: string | null): string {
  const when = resetText(resetAt);
  return GUEST_LIMIT_REPLY.replace("for today.", `for today.${when ? ` They come back ${when}.` : ""}`);
}

/** "on Fri, Nov 14 at 9:30 PM EST" in the visitor's own time zone. */
export function resetText(resetAt?: string | null, timeZone?: string): string | null {
  if (!resetAt) return null;
  const d = new Date(resetAt);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone });
  return `on ${day} at ${time}`;
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
