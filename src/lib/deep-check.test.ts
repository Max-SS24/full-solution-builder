import { describe, it, expect } from "vitest";
import { deepCheckHomepage } from "./deep-check.server";

const dns = () => new Response(JSON.stringify({ Answer: [{ type: 1, data: "93.184.216.34" }] }));
const page = () => new Response("<html><title>Clinic</title>" + "x".repeat(300) + "</html>", { headers: { "content-type": "text/html" } });
const noWait = async () => {};

describe("deep homepage recheck", () => {
  it("recovers when a later attempt succeeds", async () => {
    let calls = 0;
    const f = (async (u: string) => u.includes("dns.google") ? dns() : (++calls <= 2 ? new Response("", { status: 503 }) : page())) as typeof fetch;
    const r = await deepCheckHomepage("https://clinic.example/", f, noWait);
    expect(r.status).toBe("working");
    expect(r.reason).toBe("Recovered on attempt 2");
  });
  it("still flags a redirect to a different website", async () => {
    const f = (async (u: string) => u.includes("dns.google") ? dns() : new Response(null, { status: 301, headers: { location: "https://other.example/" } })) as typeof fetch;
    const r = await deepCheckHomepage("https://clinic.example/", f, noWait);
    expect(r.status).toBe("unexpected_redirect");
    expect(r.redirectedTo).toBe("other.example");
  });
  it("treats an error page that reports success as unavailable", async () => {
    const f = (async (u: string) => u.includes("dns.google") ? dns() : new Response("<html><title>404 Not Found</title>" + "x".repeat(300), { headers: { "content-type": "text/html" } })) as typeof fetch;
    expect((await deepCheckHomepage("https://clinic.example/", f, noWait)).status).toBe("unavailable");
  });
  it("retries 520 with the honest checker name and recovers on the first attempt", async () => {
    const f = (async (u: string, init?: RequestInit) => u.includes("dns.google") ? dns()
      : String((init?.headers as Record<string, string>)["User-Agent"]).startsWith("Mozilla") ? new Response("", { status: 520 }) : page()) as typeof fetch;
    const r = await deepCheckHomepage("https://clinic.example/", f, noWait);
    expect(r.status).toBe("working");
    expect(r.attempts).toBe(1);
  });
  it("stops after one attempt on a certificate error and keeps it unconfirmed", async () => {
    let calls = 0;
    const f = (async (u: string) => u.includes("dns.google") ? dns() : (calls++, new Response("", { status: 526 }))) as typeof fetch;
    const r = await deepCheckHomepage("https://clinic.example/", f, noWait);
    expect(r).toMatchObject({ status: "unconfirmed", attempts: 1 });
    expect(r.reason).toMatch(/security certificate/);
    expect(calls).toBe(4); // HEAD + GET, each tried with both names
  });
});
