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

describe("VA guide citations", () => {
  it("every step has a last-verified date", () => {
    for (const s of VA_GUIDE) expect(s.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

import { guideFor, vaStageOf, showVaGuide } from "./va-guide";
describe("VA guide by stage", () => {
  it("not applied includes the application step", () => {
    expect(guideFor("not_applied").some((s) => s.title.includes("10-10EZ"))).toBe(true);
  });
  it("applied skips applying and shows the welcome-call step", () => {
    const g = guideFor("applied");
    expect(g.some((s) => s.title.includes("10-10EZ"))).toBe(false);
    expect(g.some((s) => s.title.includes("welcome call"))).toBe(true);
  });
  it("registered skips application steps and asks the provider", () => {
    const g = guideFor("registered");
    expect(g.some((s) => s.title.includes("10-10EZ") || s.title.includes("welcome call"))).toBe(false);
    expect(g.some((s) => s.title.includes("Ask your VA provider"))).toBe(true);
  });
  it("stage comes from answers", () => {
    expect(vaStageOf("yes", "yes")).toBe("registered");
    expect(vaStageOf("yes", "no")).toBe("applied");
    expect(vaStageOf("no", null)).toBe("not_applied");
  });
  it("guide shows for VA and both, not community", () => {
    expect(showVaGuide("both")).toBe(true);
    expect(showVaGuide("community")).toBe(false);
  });
});
