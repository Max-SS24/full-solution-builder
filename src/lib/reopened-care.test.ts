import { describe, expect, it } from "vitest";
import { applyReopenCheck, checkOutcome, officialCheckUrl, replacementCandidates, unavailableOptions } from "./reopened-care";
import type { CareResult } from "./navigator.functions";

describe("reopened care verification", () => {
  it("allows official HTTPS links but blocks private, deceptive and arbitrary hosts", () => {
    expect(officialCheckUrl("https://www.va.gov/tampa-health-care/locations/haley/")).toBeTruthy();
    for (const url of ["http://www.va.gov/", "https://www.va.gov.evil.test/", "https://127.0.0.1/", "https://www.va.gov:8443/", "https://user:pass@www.va.gov/", "https://clinic.example/"]) expect(officialCheckUrl(url)).toBeNull();
  });
  it("does not show broken links as valid care options", () => {
    expect(checkOutcome("confirmed", "broken", "2026-11-09").status).toBe("unavailable");
  });
  it("does not treat an unreachable source as evidence of closure", () => {
    expect(checkOutcome("unconfirmed", "unchecked", "2026-11-09").status).toBe("unconfirmed");
  });
  it("does not mark an option fully confirmed when its website cannot be checked", () => {
    expect(checkOutcome("confirmed", "unchecked", "2026-11-09").status).toBe("unconfirmed");
  });
  it("does not refresh last-verified dates for unconfirmed records", () => {
    const row = { verified: true, last_checked: "2026-10-28" } as CareResult;
    expect(applyReopenCheck(row, checkOutcome("unconfirmed", "unchecked", "2026-11-09")).last_checked).toBe("2026-10-28");
    expect(applyReopenCheck(row, checkOutcome("confirmed", "working", "2026-11-09T02:00:00Z")).last_checked).toBe("2026-11-09");
  });
});

describe("replacement options", () => {
  const row = { id: "old", source_name: "VA", kind: "VA Clinic", needs: ["ptsd"], care_types: ["therapy"], formats: ["in-person"] } as CareResult;
  it("offers replacements only for unavailable records, not temporary failures", () => {
    expect(unavailableOptions([applyReopenCheck(row, checkOutcome("unavailable", "broken", "2026-11-09")), applyReopenCheck({ ...row, id: "temporary" }, checkOutcome("unconfirmed", "unchecked", "2026-11-09"))]).map((r) => r.id)).toEqual(["old"]);
  });
  it("excludes existing options and preserves the VA-only care preference", () => {
    const v = { va_vs_community: "va", need: "ptsd", care_type: "therapy", care_format: "in-person" } as import("./navigator.functions").Variables;
    expect(replacementCandidates([row, { ...row, id: "new" }, { ...row, id: "civilian", kind: "Private practice" }], [row], v).map((r) => r.id)).toEqual(["new"]);
  });
});