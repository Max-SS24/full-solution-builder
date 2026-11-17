import { communityHomepage } from "./care-links";
import { BLOCKED_REASON, blockedStatus, expectedHomepageRedirect, finalHomepageSafe, publicIpv4, type HomepageCheck } from "./homepage-check";
import type { CareResult } from "./navigator.functions";

type Fetcher = typeof fetch;
export const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 VA-Navigator-check",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Resolve through a fixed public service; refuse nonpublic addresses before any provider request. */
async function publicHost(host: string, request: Fetcher, signal: AbortSignal): Promise<boolean> {
  const response = await request(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`, { signal });
  if (!response.ok) return false;
  const data = await response.json() as { Answer?: { type: number; data: string }[] };
  const ips = data.Answer?.filter((a) => a.type === 1).map((a) => a.data) ?? [];
  return ips.length > 0 && ips.every(publicIpv4);
}

/** Check only source-supplied links. Do not follow an unfamiliar domain or interpret page contents. */
export async function checkHomepage(raw: string, request: Fetcher = fetch): Promise<HomepageCheck> {
  const checkedAt = new Date().toISOString();
  const result = (status: HomepageCheck["status"], redirectedTo?: string, reason?: string, blocked?: boolean): HomepageCheck => ({ status, checkedAt, ...(redirectedTo ? { redirectedTo } : {}), ...(reason ? { reason } : {}), ...(blocked ? { blocked } : {}) });
  const signal = AbortSignal.timeout(10000);
  try {
    let url = new URL(raw);
    const original = url;
    const visited = new Set<string>();
    for (let hop = 0; hop < 6; hop++) {
      if (visited.has(url.href)) return result("unexpected_redirect");
      visited.add(url.href);
      if (!expectedHomepageRedirect(original, url)) return result("unexpected_redirect", url.hostname);
      if (!await publicHost(url.hostname, request, signal)) return result("unconfirmed", undefined, "Website address could not be found on the public internet");
      const response = await request(url.href, { redirect: "manual", signal, headers: BROWSER_HEADERS });
      await response.body?.cancel();
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return result("unexpected_redirect");
        const next = new URL(location, url);
        if (!expectedHomepageRedirect(original, next)) return result("unexpected_redirect", `${next.hostname}`);
        url = next;
        continue;
      }
      if (!finalHomepageSafe(original, url)) return result("unexpected_redirect", url.hostname, "Secure link ends on an insecure page");
      if (response.ok) return result("working");
      if ([404, 410].includes(response.status) || response.status >= 500) return result("unavailable");
      if (blockedStatus(response.status, response.headers)) return result("unconfirmed", undefined, BLOCKED_REASON, true);
      return result("unconfirmed", undefined, `Site refused the check (${response.status})`); // Does not prove the site is down.
    }
    return result("unexpected_redirect");
  } catch { return result("unconfirmed", undefined, "Site did not respond in time"); }
}

export async function checkCommunityHomepages<T extends CareResult>(rows: T[]): Promise<(T & { homepageCheck?: HomepageCheck })[]> {
  const checks = new Map<string, Promise<HomepageCheck>>();
  return Promise.all(rows.map(async (row) => {
    const homepage = communityHomepage(row);
    if (!homepage) return row;
    let check = checks.get(homepage);
    if (!check) { check = checkHomepage(homepage); checks.set(homepage, check); }
    return { ...row, homepageCheck: await check };
  }));
}