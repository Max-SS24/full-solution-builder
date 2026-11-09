import { describe, expect, it } from "vitest";
import { applyReopenCheck, checkOutcome, officialCheckUrl } from "./reopened-care";
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
  it("does not refresh last-verified dates for unconfirmed records", () => {
    const row = { verified: true, last_checked: "2026-10-28" } as CareResult;
    expect(applyReopenCheck(row, checkOutcome("unconfirmed", "unchecked", "2026-11-09")).last_checked).toBe("2026-10-28");
    expect(applyReopenCheck(row, checkOutcome("confirmed", "working", "2026-11-09T02:00:00Z")).last_checked).toBe("2026-11-09");
  });
});