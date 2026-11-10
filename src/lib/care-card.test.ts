import { describe, expect, it } from "vitest";
import { cardAddress, cardStatus } from "./care-card";
import type { CareResult } from "./navigator.functions";

const result: CareResult = { id: "test", name: "Facility", kind: "VA", city: null, state: null, formats: [], needs: [], care_types: [], payment: [], veteran_focus: true, phone: null, source_url: "https://www.va.gov/", verified: true, last_checked: "2026-11-10", source_name: "VA.gov" };
describe("care card data", () => {
  it("uses only a source-supplied street address", () => {
    expect(cardAddress({ ...result, bio: "123 Main Street, Boston, MA 02130. VA clinic." })).toBe("123 Main Street, Boston, MA 02130");
    expect(cardAddress(result)).toBeNull();
  });
  it("preserves a failed page check", () => {
    expect(cardStatus({ ...result, review: "page_missing" })).toBe("Needs review — call to confirm");
  });
  it("preserves unavailable reopened results", () => {
    expect(cardStatus({ ...result, reopenCheck: { status: "unavailable" } })).toBe("Unavailable — search for current options");
  });
  it("does not present unverified listings as confirmed", () => {
    expect(cardStatus({ ...result, verified: false })).toBe("Needs review — call to confirm");
  });
});