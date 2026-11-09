import { describe, expect, it, vi } from "vitest";
import { checkHomepage } from "./homepage-check.server";
import { expectedHomepageRedirect, publicIpv4 } from "./homepage-check";

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
    expect(expectedHomepageRedirect(new URL("https://provider.example"), new URL("http://provider.example"))).toBe(false);
    expect(expectedHomepageRedirect(new URL("https://provider.example"), new URL("https://provider.example.attacker.example"))).toBe(false);
  });
});