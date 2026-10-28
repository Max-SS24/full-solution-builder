import { describe, it, expect } from "vitest";
import { territoryHelp } from "./territory-guidance";
describe("territory fallback", () => {
  it("American Samoa lists its Vet Center", () => expect(territoryHelp("AS", false)?.steps[0]?.phone).toBe("684-699-3760"));
  it("community-only drops VA.gov steps", () => expect(territoryHelp("MP", true)?.steps.some((s) => s.url?.includes("va.gov"))).toBe(false));
  it("states get no territory guidance", () => expect(territoryHelp("GA", false)).toBeNull());
});
