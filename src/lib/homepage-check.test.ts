import { describe, expect, it, vi } from "vitest";
import { checkHomepage } from "./homepage-check.server";
import { expectedHomepageRedirect, finalHomepageSafe, publicIpv4 } from "./homepage-check";

function requester(responses: Response[]) {
  return vi.fn<typeof fetch>(async (input) => String(input).startsWith("https://dns.google/")
    ? Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] })
    : responses.shift() ?? new Response("", { status: 200 }));
}

describe("community homepage checks", () => {
  it("confirms a working homepage", async () => {
    expect((await checkHomepage("https://provider.example/", requester([new Response("OK")]))).status).toBe("working");
  });
  it("flags a missing homepage as unavailable", async () => {
    expect((await checkHomepage("https://provider.example/", requester([new Response("", { status: 404 })]))).status).toBe("unavailable");
  });
  it("flags unexpected redirects without fetching their destination", async () => {
    const request = requester([new Response(null, { status: 302, headers: { location: "https://unrelated.example/sale" } })]);
    expect(await checkHomepage("https://provider.example/", request)).toMatchObject({ status: "unexpected_redirect", redirectedTo: "unrelated.example" });
    expect(request.mock.calls.some(([url]) => String(url).includes("unrelated.example"))).toBe(false);
  });
  it("allows HTTPS upgrades and www canonicalization", async () => {
    const request = requester([new Response(null, { status: 301, headers: { location: "https://www.provider.example/home" } }), new Response("OK")]);
    expect((await checkHomepage("http://provider.example/", request)).status).toBe("working");
  });
  it("keeps blocked and timed-out sites unconfirmed rather than unavailable", async () => {
    expect((await checkHomepage("https://provider.example/", requester([new Response("", { status: 403 })]))).status).toBe("unconfirmed");
    expect((await checkHomepage("https://provider.example/", vi.fn(async () => { throw new Error("timeout"); }))).status).toBe("unconfirmed");
  });
  it("rejects local DNS answers before requesting a provider", async () => {
    const request = vi.fn<typeof fetch>(async () => Response.json({ Answer: [{ type: 1, data: "127.0.0.1" }] }));
    expect((await checkHomepage("https://provider.example/", request)).status).toBe("unconfirmed");
    expect(request).toHaveBeenCalledTimes(1);
    for (const ip of ["10.0.0.1", "172.16.0.1", "169.254.169.254", "192.168.1.1", "100.64.0.1"]) expect(publicIpv4(ip)).toBe(false);
  });
  it("rejects HTTPS downgrades and similar-looking hosts", () => {
    expect(finalHomepageSafe(new URL("https://provider.example"), new URL("http://provider.example"))).toBe(false);
    expect(expectedHomepageRedirect(new URL("https://provider.example"), new URL("https://provider.example.attacker.example"))).toBe(false);
  });
});
describe("website check false alarms", () => {
  it("treats ordinary hosting addresses (e.g. 198.71.x) as public but still blocks private ones", () => {
    expect(publicIpv4("198.71.233.33")).toBe(true);
    expect(publicIpv4("192.124.249.10")).toBe(true);
    expect(publicIpv4("203.17.1.1")).toBe(true);
    for (const ip of ["10.0.0.1", "192.168.1.1", "172.16.0.1", "127.0.0.1", "169.254.1.1", "198.18.0.1", "203.0.113.5", "192.0.2.1"]) expect(publicIpv4(ip)).toBe(false);
  });
  it("accepts a same-site http hop that ends back on https", async () => {
    const request = requester([
      new Response(null, { status: 301, headers: { location: "http://provider.example/" } }),
      new Response(null, { status: 301, headers: { location: "https://provider.example/" } }),
      new Response("OK"),
    ]);
    expect((await checkHomepage("https://www.provider.example/", request)).status).toBe("working");
  });
  it("labels firewall blocks clearly instead of calling the site down", async () => {
    const r = await checkHomepage("https://provider.example/", requester([new Response("", { status: 403 })]));
    expect(r).toMatchObject({ status: "unconfirmed", blocked: true });
  });
});
describe("insecure endings", () => {
  it("flags a secure link that ends on a plain http page", async () => {
    const request = requester([new Response(null, { status: 301, headers: { location: "http://provider.example/" } }), new Response("OK")]);
    expect((await checkHomepage("https://provider.example/", request)).status).toBe("unexpected_redirect");
  });
});
describe("checker-side errors (520/525/526)", () => {
  const ua = (init?: RequestInit) => (init?.headers as Record<string, string> | undefined)?.["User-Agent"] ?? "";
  it("retries a 520 with the honest checker name and accepts the working site", async () => {
    const request = vi.fn<typeof fetch>(async (input, init) => String(input).startsWith("https://dns.google/")
      ? Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] })
      : ua(init).startsWith("Mozilla") ? new Response("", { status: 520 }) : new Response("OK"));
    expect((await checkHomepage("https://provider.example/", request)).status).toBe("working");
    expect(request.mock.calls.some(([, init]) => ua(init).startsWith("VA-Navigator-LinkCheck"))).toBe(true);
  });
  it("retries a dropped connection with the honest checker name", async () => {
    const request = vi.fn<typeof fetch>(async (input, init) => {
      if (String(input).startsWith("https://dns.google/")) return Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] });
      if (ua(init).startsWith("Mozilla")) throw new TypeError("connection reset");
      return new Response("OK");
    });
    expect((await checkHomepage("https://provider.example/", request)).status).toBe("working");
  });
  it("never calls a site down when every try gets 520", async () => {
    const r = await checkHomepage("https://provider.example/", requester([new Response("", { status: 520 }), new Response("", { status: 520 })]));
    expect(r).toMatchObject({ status: "unconfirmed", blocked: true });
  });
  it("labels a certificate our checker can't verify (526) as unconfirmed, not down", async () => {
    const r = await checkHomepage("https://provider.example/", requester([new Response("", { status: 526 }), new Response("", { status: 526 })]));
    expect(r.status).toBe("unconfirmed");
    expect(r.reason).toMatch(/security certificate/);
  });
  it("still calls a real server error (500) unavailable", async () => {
    expect((await checkHomepage("https://provider.example/", requester([new Response("", { status: 500 })]))).status).toBe("unavailable");
  });
});

import { CERT_REASON, BLOCKED_REASON, DROPPED_REASON, withoutUnverifiedCertificates } from "./homepage-check";
describe("care options with an unverifiable security certificate", () => {
  it("marks a 526 certificate failure so the option can be withheld", async () => {
    const r = await checkHomepage("https://provider.example/", requester([new Response("", { status: 526 }), new Response("", { status: 526 })]));
    expect(r.certificate).toBe("unverified");
  });
  it("does not mark a dropped connection (520) as a certificate problem", async () => {
    const r = await checkHomepage("https://provider.example/", requester([new Response("", { status: 520 }), new Response("", { status: 520 })]));
    expect(r.certificate).toBeUndefined();
  });
  it("removes only options whose certificate couldn't be verified", () => {
    const at = "2026-11-23T00:00:00Z";
    const rows = [
      { id: "cert", homepageCheck: { status: "unconfirmed" as const, checkedAt: at, reason: CERT_REASON, certificate: "unverified" as const } },
      { id: "old-cert", homepageCheck: { status: "unconfirmed" as const, checkedAt: at, reason: CERT_REASON } },
      { id: "firewall", homepageCheck: { status: "unconfirmed" as const, checkedAt: at, reason: BLOCKED_REASON, blocked: true } },
      { id: "dropped", homepageCheck: { status: "unconfirmed" as const, checkedAt: at, reason: DROPPED_REASON } },
      { id: "down", homepageCheck: { status: "unavailable" as const, checkedAt: at } },
      { id: "no-site" },
    ];
    expect(withoutUnverifiedCertificates(rows).map((r) => r.id)).toEqual(["firewall", "dropped", "down", "no-site"]);
  });
});
