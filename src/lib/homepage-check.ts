export type HomepageCheck = {
  status: "working" | "unavailable" | "unexpected_redirect" | "unconfirmed";
  checkedAt: string;
  redirectedTo?: string;
};

/** Only www canonicalization and HTTP→HTTPS on the same host are routine redirects. */
export function expectedHomepageRedirect(from: URL, to: URL): boolean {
  return from.hostname.replace(/^www\./, "") === to.hostname.replace(/^www\./, "") &&
    !(from.protocol === "https:" && to.protocol === "http:") &&
    ["https:", "http:"].includes(to.protocol) && !to.username && !to.password && !to.port;
}

export function publicIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  return a !== 0 && a !== 10 && a !== 127 && a !== 169 && a !== 192 && a !== 198 && a !== 203 &&
    !(a === 172 && b != null && b >= 16 && b <= 31) && !(a === 100 && b != null && b >= 64 && b <= 127) && a != null && a < 224;
}