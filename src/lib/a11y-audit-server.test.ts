import { afterEach, describe, expect, it, vi } from "vitest";
import { auditPages } from "./a11y-audit.server";
import { AUDIT_PUBLIC_PAGES } from "./a11y-audit";

const goodPage = `<html lang="en"><head><title>VA Navigator</title><script>localStorage.getItem("van_a11y")</script></head>
<body><a href="#main">Skip to main content</a><main id="main"><h1>Find care</h1></main></body></html>`;

afterEach(() => vi.unstubAllGlobals());

describe("Sunday server accessibility audit", () => {
  it("renders every public page without requesting the app's own address over the network", async () => {
    const network = vi.fn(async () => new Response("", { status: 403 }));
    vi.stubGlobal("fetch", network);
    const load = vi.fn(async () => new Response(goodPage, { headers: { "content-type": "text/html" } }));
    const results = await auditPages("https://va-navigator.lovable.app", load);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(load).toHaveBeenCalledTimes(AUDIT_PUBLIC_PAGES.length);
    expect(network).not.toHaveBeenCalled();
  });
  it("still reports a page that fails to render", async () => {
    const results = await auditPages("https://va-navigator.lovable.app", async (path) => new Response("", { status: path === "/terms" ? 500 : 200 }));
    expect(results.find((r) => r.path === "/terms")).toMatchObject({ ok: false, problems: ["Page returned status 500"] });
  });
});
