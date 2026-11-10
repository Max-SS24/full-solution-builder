import { describe, expect, it } from "vitest";
import { PREP_DISCLAIMER, PREP_FACTS, applyChecks, factStillValid, factsFor, isPrepUrl, pageText } from "./appointment-prep";

describe("appointment prep", () => {
  it("never marks a fact verified without a passing check", () => {
    const v = applyChecks(PREP_FACTS, [{ id: "elig-basic", ok: false, checkedAt: "x" }]);
    expect(v.every((x) => !x.verified)).toBe(true);
  });
  it("marks only passing facts verified", () => {
    const v = applyChecks(PREP_FACTS, [{ id: "elig-access", ok: true, checkedAt: "x" }]);
    expect(v.filter((x) => x.verified).map((x) => x.fact.id)).toEqual(["elig-access"]);
  });
  it("only allows official VA.gov sources", () => {
    expect(isPrepUrl("https://evil.example/va")).toBe(false);
    expect(isPrepUrl("http://www.va.gov/x")).toBe(false);
    expect(PREP_FACTS.every((f) => isPrepUrl(f.sourceUrl))).toBe(true);
  });
  it("rejects a fact when the page changed or failed", () => {
    const f = PREP_FACTS.find((x) => x.id === "elig-access")!;
    const good = pageText("<p>30-minute average drive time or 20-day wait time</p><p>60-minute average drive time or 28-day wait time</p>");
    expect(factStillValid(f, 200, good)).toBe(true);
    expect(factStillValid(f, 200, pageText("<p>new standards</p>"))).toBe(false);
    expect(factStillValid(f, 404, good)).toBe(false);
    expect(factStillValid(f, 301, good)).toBe(false);
  });
  it("disclaimer says guidance is from VA and Navigator is not liable for approval or denial", () => {
    expect(PREP_DISCLAIMER).toContain("official U.S. Department of Veterans Affairs documentation");
    expect(PREP_DISCLAIMER).toContain("not responsible for any approval or denial");
  });
  it("referral steps only show to registered patients", () => {
    expect(factsFor("not_applied").some((f) => f.topic === "referral")).toBe(false);
    expect(factsFor("registered").some((f) => f.topic === "referral")).toBe(true);
  });
});
