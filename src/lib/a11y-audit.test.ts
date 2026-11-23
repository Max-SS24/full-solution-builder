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

describe("auto-resolving older accessibility failures", () => {
  const pages = (fails: string[], all = ["/", "/terms", "/privacy"]) => all.map((path) => ({ path, ok: !fails.includes(path), problems: fails.includes(path) ? ["x"] : [] }));
  const run = (id: string, kind: string, at: string, fails: string[], all?: string[]) =>
    ({ id, kind, ok: fails.length === 0, failed: fails.length, ran_at: at, acknowledged_at: null, results: pages(fails, all) });

  it("clears an older failure once a newer check of the same kind passes all pages", () => {
    expect(openA11yFailures([run("old", "server", "2026-11-22T09:17:00Z", ["/", "/terms"]), run("pass", "server", "2026-11-23T04:21:00Z", [])])).toEqual([]);
  });
  it("keeps the alert when the newer check still fails a page", () => {
    const out = openA11yFailures([run("old", "server", "2026-11-22T09:17:00Z", ["/terms"]), run("new", "server", "2026-11-23T04:21:00Z", ["/privacy"])]);
    expect(out.map((r) => r.id)).toEqual(["new", "old"]);
  });
  it("never lets a passing run clear a failure that happened after it", () => {
    const out = openA11yFailures([run("pass", "server", "2026-11-22T09:17:00Z", []), run("later", "server", "2026-11-23T04:21:00Z", ["/terms"])]);
    expect(out.map((r) => r.id)).toEqual(["later"]);
  });
  it("a Sunday page check pass does not clear an in-browser diagnostic failure", () => {
    const out = openA11yFailures([run("browser", "browser", "2026-11-22T09:17:00Z", ["/terms"]), run("server", "server", "2026-11-23T04:21:00Z", [])]);
    expect(out.map((r) => r.id)).toEqual(["browser"]);
  });
  it("keeps the alert when the passing check didn't cover the failed page", () => {
    const out = openA11yFailures([run("old", "browser", "2026-11-22T09:17:00Z", ["/admin"], ["/", "/admin"]), run("pass", "browser", "2026-11-23T04:21:00Z", [], ["/"])]);
    expect(out.map((r) => r.id)).toEqual(["old"]);
  });
  it("hides a failure the database already marked resolved", () => {
    expect(openA11yFailures([{ ...run("old", "server", "2026-11-22T09:17:00Z", ["/"]), resolved_by_run: "pass" }])).toEqual([]);
  });
});
