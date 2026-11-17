import { expectedHomepageRedirect, publicIpv4, type HomepageCheck } from "./homepage-check";

type Fetcher = typeof fetch;
export type DeepCheck = HomepageCheck & { reason: string; attempts: number };
type Attempt = { status: HomepageCheck["status"]; redirectedTo?: string; reason: string };

async function publicHost(host: string, request: Fetcher, signal: AbortSignal) {
  const r = await request(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`, { signal });
  if (!r.ok) return false;
  const d = await r.json() as { Answer?: { type: number; data: string }[] };
  const ips = d.Answer?.filter((a) => a.type === 1).map((a) => a.data) ?? [];
  return ips.length > 0 && ips.every(publicIpv4);
}

const SOFT_404 = /<title>[^<]*(404|not found|page unavailable|error)[^<]*<\/title>/i;

async function attemptOnce(raw: string, request: Fetcher, timeoutMs: number): Promise<Attempt> {
  const signal = AbortSignal.timeout(timeoutMs);
  const headers = { "User-Agent": "Mozilla/5.0 (compatible; VA-Navigator/1.0 deep homepage check)", Accept: "text/html,*/*" };
  const original = new URL(raw);
  let url = original;
  const visited = new Set<string>();
  for (let hop = 0; hop < 6; hop++) {
    if (visited.has(url.href)) return { status: "unexpected_redirect", reason: "Redirect loop" };
    visited.add(url.href);
    if (!expectedHomepageRedirect(original, url)) return { status: "unexpected_redirect", redirectedTo: url.hostname, reason: `Leads to a different website (${url.hostname})` };
    if (!await publicHost(url.hostname, request, signal)) return { status: "unconfirmed", reason: "Website address could not be found on the public internet" };
    let res = await request(url.href, { method: "HEAD", redirect: "manual", signal, headers });
    await res.body?.cancel();
    const isRedirect = (s: number) => s >= 300 && s < 400;
    if (!isRedirect(res.status)) res = await request(url.href, { method: "GET", redirect: "manual", signal, headers });
    if (isRedirect(res.status)) {
      await res.body?.cancel();
      const loc = res.headers.get("location");
      if (!loc) return { status: "unexpected_redirect", reason: "Redirect without a destination" };
      url = new URL(loc, url);
      continue;
    }
    if (res.ok) {
      const type = res.headers.get("content-type") ?? "";
      const body = (await res.text()).slice(0, 200000);
      if (!/html/i.test(type)) return { status: "unconfirmed", reason: "Address did not return a web page" };
      if (body.trim().length < 200) return { status: "unconfirmed", reason: "Page loaded but was empty" };
      if (SOFT_404.test(body)) return { status: "unavailable", reason: "Page loads but shows an error message" };
      return { status: "working", reason: "Page loaded with content" };
    }
    await res.body?.cancel();
    if ([404, 410].includes(res.status) || res.status >= 500) return { status: "unavailable", reason: `Site responded with error ${res.status}` };
    return { status: "unconfirmed", reason: `Site refused the check (${res.status})` };
  }
  return { status: "unexpected_redirect", reason: "Too many redirects" };
}

/** Deeper admin recheck: up to 3 tries with longer waits, HEAD then GET, content sanity check. */
export async function deepCheckHomepage(raw: string, request: Fetcher = fetch, wait = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<DeepCheck> {
  let last: Attempt = { status: "unconfirmed", reason: "Not checked" };
  for (let n = 1; n <= 3; n++) {
    try { last = await attemptOnce(raw, request, 8000 + n * 4000); }
    catch { last = { status: "unconfirmed", reason: "Site did not respond in time" }; }
    if (last.status === "working") return { ...last, checkedAt: new Date().toISOString(), attempts: n, reason: n > 1 ? `Recovered on attempt ${n}` : last.reason };
    if (last.status === "unexpected_redirect") break; // A foreign redirect won't change with retries.
    if (n < 3) await wait(n * 1500);
  }
  const attempts = last.status === "unexpected_redirect" ? 1 : 3;
  return { ...last, checkedAt: new Date().toISOString(), attempts, reason: attempts > 1 ? `Still failing after 3 tries: ${last.reason}` : last.reason };
}
