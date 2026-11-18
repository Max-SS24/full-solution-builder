import { describe, expect, it } from "vitest";
import { crisisSafe, mergeSearchPrefs, sourceLinkFor, verifiedSourceLabel } from "./result-source";
import { Candidate } from "./match.functions";
import { buildDataExport } from "./data-export";

describe("QA report fixes (remaining)", () => {
  it("crisis without a location shows no results (VA-004)", () => {
    expect(crisisSafe(true, false, [1, 2])).toEqual([]);
    expect(crisisSafe(true, true, [1, 2])).toEqual([1, 2]);
    expect(crisisSafe(false, false, [1])).toEqual([1]);
  });
  it("listings without a source get no link (VA-005)", () => {
    expect(sourceLinkFor({ id: "x", source_url: "", source_name: "NPI" })).toBeNull();
    expect(sourceLinkFor({ id: "x", source_url: "https://www.va.gov/a", source_name: "VA" })).toBe("https://www.va.gov/a");
    expect(sourceLinkFor({ id: "ft-1", source_url: "", source_name: "FindTreatment.gov" })).toBe("https://findtreatment.gov/locator");
  });
  it("verification label names the real source (VA-006)", () => {
    expect(verifiedSourceLabel({ id: "x", source_url: "https://www.va.gov/a", source_name: "VA" })).toBe("VA.gov");
    expect(verifiedSourceLabel({ id: "x", source_url: "https://findtreatment.gov/x", source_name: "FindTreatment.gov" })).toBe("FindTreatment.gov");
    expect(verifiedSourceLabel({ id: "x", source_url: "https://notva.gov.example.com", source_name: "Other" })).toBe("Other");
  });
  it("provider matching keeps telehealth formats (VA-007)", () => {
    expect(Candidate.parse({ id: "a", formats: ["in-person", "telehealth"] }).formats).toEqual(["in-person", "telehealth"]);
  });
  it("saved preferences beat questionnaire answers (VA-009)", () => {
    expect(mergeSearchPrefs({ location: "Old, GA", need: "ptsd" }, { location: "Chicago, IL" })).toEqual({ location: "Chicago, IL", need: "ptsd" });
  });
  it("data download includes history and preferences but no secrets (VA-010)", () => {
    const out = JSON.parse(buildDataExport({ userId: "u1", email: "a@b.co", prefs: { need: "ptsd" }, history: [{ id: 1 }], security: { email_mfa: true, code_hash: "x" } as never, recovery: [] }));
    expect(out.preferences).toEqual({ need: "ptsd" });
    expect(out.search_history).toHaveLength(1);
    expect(out.sign_in_security).toEqual({ email_mfa: true, updated_at: null });
    expect(JSON.stringify(out)).not.toContain("code_hash");
  });
});
