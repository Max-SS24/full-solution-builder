import { describe, it, expect } from "vitest";
import { auditHtml } from "./a11y-audit";
const good = `<html lang="en"><head><title>Home | VA</title><script>localStorage.getItem("van_a11y")</script></head><body><button>Skip to main content</button><main id="main"><h1>Hi</h1></main></body></html>`;
describe("auditHtml", () => {
  it("passes a complete page", () => expect(auditHtml("/", good).ok).toBe(true));
  it("flags a missing heading", () => expect(auditHtml("/", good.replace(/<h1>Hi<\/h1>/, "")).problems).toContain("Page heading (h1) missing"));
});
