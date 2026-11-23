export type HomepageCheck = {
  status: "working" | "unavailable" | "unexpected_redirect" | "unconfirmed";
  checkedAt: string;
  redirectedTo?: string;
  /** Plain-language detail, e.g. that a firewall blocked automated checks. */
  reason?: string;
  /** True when the site answered but refused automated checks (it usually opens fine in a browser). */
  blocked?: boolean;
};

/** Same site (ignoring www), over http(s), no credentials/ports. Protocol hops in the middle are fine;
 * the final destination must be HTTPS when the original link was HTTPS (checked by finalHomepageSafe). */
export function expectedHomepageRedirect(from: URL, to: URL): boolean {
  return from.hostname.replace(/^www\./, "") === to.hostname.replace(/^www\./, "") &&
    ["https:", "http:"].includes(to.protocol) && !to.username && !to.password && !to.port;
}

/** A link that started on HTTPS must not end on plain HTTP. */
export function finalHomepageSafe(from: URL, end: URL): boolean {
  return !(from.protocol === "https:" && end.protocol === "http:");
}

/** Firewall / bot-protection responses: the site is up but refuses automated requests. */
export function blockedStatus(status: number, headers?: Headers): boolean {
  if ([401, 403, 406, 429, 451].includes(status)) return true;
  return status === 503 && !!headers && (/cloudflare|akamai|sucuri|incapsula/i.test(headers.get("server") ?? "") || headers.has("cf-mitigated"));
}
export const BLOCKED_REASON = "Site blocks automated checks (protected by a firewall) — it may still open normally in a browser";

/** First try: browser-like headers (some sites refuse unknown clients). */
export const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 VA-Navigator-check",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};
/** Second try: an honest checker name. Many hosts (e.g. SiteGround) drop connections that claim to be Chrome
 * but don't look like Chrome; behind the server's network that surfaces as a 520 error. */
export const CHECKER_HEADERS = {
  "User-Agent": "VA-Navigator-LinkCheck/1.0 (+https://va-navigator.lovable.app)",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};
/** Errors produced by the network in front of our server, not by the provider's site:
 * 520 = the site dropped our connection, 525/526 = our checker couldn't verify the site's certificate. */
export const CHECKER_SIDE_ERRORS = [520, 525, 526];
export const DROPPED_REASON = "Site dropped the connection for our automated checker — it may still open normally in a browser";
export const CERT_REASON = "Our checker couldn't verify this site's security certificate — it may still open normally in a browser; check it before relying on it";

/** Reason for a checker-side error, or null when the status is a real answer from the site. */
export function checkerSideReason(status: number): string | null {
  if (status === 520) return DROPPED_REASON;
  if (status === 525 || status === 526) return CERT_REASON;
  return null;
}

/** Fetch with browser-like headers, retrying once with the honest checker name on a checker-side error or dropped connection. */
export async function fetchSite(request: typeof fetch, url: string, init: RequestInit): Promise<Response> {
  let first: Response | undefined;
  try {
    first = await request(url, { ...init, headers: BROWSER_HEADERS });
    if (!CHECKER_SIDE_ERRORS.includes(first.status)) return first;
    await first.body?.cancel();
  } catch (error) {
    if (init.signal?.aborted) throw error;
  }
  try { return await request(url, { ...init, headers: CHECKER_HEADERS }); }
  catch (error) { if (first) return first; throw error; }
}

const PRIVATE_V4: [number, number, number][] = [
  // [first octet, second-octet min, second-octet max] for ranges inside a /8
  [10, 0, 255], [127, 0, 255], [0, 0, 255],
  [169, 254, 254], [172, 16, 31], [192, 168, 168], [100, 64, 127], [198, 18, 19],
];
/** Reject private, loopback, link-local, CGNAT, benchmark, documentation and multicast/reserved IPv4. */
export function publicIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = parts as [number, number, number, number];
  if (a >= 224) return false;
  if (PRIVATE_V4.some(([x, lo, hi]) => a === x && b >= lo && b <= hi)) return false;
  // 192.0.0.0/24, 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
  if ((a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)) return false;
  return true;
}
