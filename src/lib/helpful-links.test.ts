import { describe, it, expect } from "vitest";
import { isLinkCurrent, ALL_LINKS } from "./helpful-links";

describe("helpful link verification", () => {
  it("passes a live page that still shows the form number", () => {
    expect(isLinkCurrent(200, "About VA Form 10-10EZ", "10-10ez")).toBe(true);
  });
  it("fails a page that loads but no longer shows the form", () => {
    expect(isLinkCurrent(200, "Find a form", "10-10ez")).toBe(false);
  });
  it("fails a missing page", () => {
    expect(isLinkCurrent(404, "10-10ez", "10-10ez")).toBe(false);
  });
  it("only links to official VA.gov pages", () => {
    expect(ALL_LINKS.every((l) => l.url.startsWith("https://www.va.gov/"))).toBe(true);
  });
});
