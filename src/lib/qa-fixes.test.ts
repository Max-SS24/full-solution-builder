import { describe, expect, it } from "vitest";
import { facilityMatches, vaChoiceIn } from "./navigator.functions";

describe("QA report fixes", () => {
  it("naming a VA facility does not switch care to VA-only (VA-002)", () => {
    expect(vaChoiceIn("I'm registered at Jesse Brown VA Medical Center")).toBe(false);
    expect(vaChoiceIn("I want VA care")).toBe(true);
  });
  it("matches Junior/Jr. and ignores the state (VA-008)", () => {
    expect(facilityMatches("Edward Hines Junior Hospital in Hines, IL", "Edward Hines, Jr. VA Hospital")).toBe(true);
    expect(facilityMatches("Jesse Brown", "Edward Hines, Jr. VA Hospital")).toBe(false);
  });
});
