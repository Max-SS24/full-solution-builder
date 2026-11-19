import { describe, it, expect } from "vitest";
import { auditHtml } from "./a11y-audit";
const good = `<html lang="en"><head><title>Home | VA</title><script>localStorage.getItem("van_a11y")</script></head><body><button>Skip to main content</button><main id="main"><h1>Hi</h1></main></body></html>`;
describe("auditHtml", () => {
  it("passes a complete page", () => expect(auditHtml("/", good).ok).toBe(true));
  it("flags a missing heading", () => expect(auditHtml("/", good.replace(/<h1>Hi<\/h1>/, "")).problems).toContain("Page heading (h1) missing"));
});

import { openA11yFailures } from "./a11y-audit";
describe("openA11yFailures", () => {
  const run = (id: string, ok: boolean, ack: string | null, at: string) => ({ id, kind: "server", ok, failed: ok ? 0 : 1, ran_at: at, acknowledged_at: ack });
  it("alerts only on failed runs nobody reviewed, newest first", () => {
    const out = openA11yFailures([run("a", false, null, "2026-11-01"), run("b", true, null, "2026-11-08"), run("c", false, "2026-11-09", "2026-11-08"), run("d", false, null, "2026-11-15")]);
    expect(out.map((r) => r.id)).toEqual(["d", "a"]);
  });
});
