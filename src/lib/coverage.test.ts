import { describe, expect, it } from "vitest";
import { COVERAGE_NOTE, coverageNote, findForeignPlace, mentionsUSArea, outOfAreaNotice, withNotice } from "./coverage";

describe("out-of-coverage location note", () => {
  it("names the place when it is outside U.S. coverage", () => {
    expect(findForeignPlace("I'm in London, England and need PTSD counseling")).toBe("London");
    expect(findForeignPlace("Toronto, Canada, anxiety, community provider")).toBe("Toronto");
    expect(findForeignPlace("I live in Berlin")).toBe("Berlin");
    expect(findForeignPlace("I'm from Kingston, Jamaica")).toBe("Jamaica");
  });

  it("says nothing when the message names a U.S. state, territory or ZIP", () => {
    for (const t of [
      "I need PTSD care in Atlanta, GA",
      "I'm in New Mexico and need help",
      "I live in Paris, TX",
      "I live in American Samoa",
      "San Juan, Puerto Rico, grief counseling",
      "I'm in Saipan, Northern Mariana Islands",
      "I need help near 30301",
      "I'm in London, Ohio",
    ]) {
      expect(mentionsUSArea(t), t).toBe(true);
      expect(outOfAreaNotice(t), t).toBeNull();
    }
  });

  it("says nothing when no place was given, or the place is only service history", () => {
    expect(outOfAreaNotice("I need PTSD help")).toBeNull();
    expect(outOfAreaNotice("I served in Iraq and need PTSD counseling")).toBeNull();
    expect(outOfAreaNotice("I was stationed in Germany, now I need help")).toBeNull();
  });

  it("states the full coverage area and the place it cannot search", () => {
    const note = coverageNote("London");
    expect(note).toContain("50 U.S. states");
    expect(note).toContain("Washington, D.C.");
    for (const t of ["Puerto Rico", "Guam", "U.S. Virgin Islands", "American Samoa", "Northern Mariana Islands"]) {
      expect(note, t).toContain(t);
    }
    expect(note).toContain("I can't search London");
    expect(COVERAGE_NOTE).toContain("U.S. territories");
  });

  it("keeps the notice before the question so it is read first", () => {
    const reply = "I'm sorry you're carrying this. What city and state (or ZIP) should I search near?";
    const out = withNotice(reply, "Searches here cover the 50 U.S. states. I can't search London.");
    expect(out.indexOf("I can't search London")).toBeLessThan(out.indexOf("What city and state"));
    expect(out.endsWith("What city and state (or ZIP) should I search near?")).toBe(true);
  });

  it("appends the notice when the reply asks nothing", () => {
    expect(withNotice("I found options from approved sources.", "Searches here cover the 50 U.S. states.")).toBe(
      "I found options from approved sources. Searches here cover the 50 U.S. states.",
    );
    expect(withNotice("", "Searches here cover the 50 U.S. states.")).toBe("Searches here cover the 50 U.S. states.");
  });
});
