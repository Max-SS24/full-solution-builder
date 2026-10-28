import { describe, it, expect } from "vitest";
import { VA_GUIDE, showVaGuide } from "./va-guide";

describe("VA guide", () => {
  it("shows only when VA care is preferred", () => {
    expect(showVaGuide("va")).toBe(true);
    expect(showVaGuide("community")).toBe(false);
    expect(showVaGuide("either")).toBe(false);
    expect(showVaGuide(null)).toBe(false);
  });
  it("every step links to an official va.gov page", () => {
    for (const s of VA_GUIDE) expect(s.url.startsWith("https://www.va.gov/")).toBe(true);
  });
  it("uses the verified VA phone numbers", () => {
    const all = VA_GUIDE.map((s) => s.detail).join(" ");
    expect(all).toContain("877-222-8387");
    expect(all).toContain("988");
  });
});
