import { describe, expect, it } from "vitest";
import { guidanceReportRow, guidanceReportSchema } from "./guidance-reports";
import { PREP_FACTS } from "./appointment-prep";

describe("guidance reporting", () => {
  it("stores the actual guidance and official source, not caller-supplied replacements", () => {
    const row = guidanceReportRow({ factId: "elig-basic", reason: "outdated", details: " Please review. ", source_url: "https://example.com", finding: "injected" });
    expect(row.source_url).toBe(PREP_FACTS[0]?.sourceUrl);
    expect(row.finding).toBe(PREP_FACTS[0]?.finding);
    expect(row.details).toBe("Please review.");
  });
  it("rejects unknown guidance and unsupported reasons", () => {
    expect(guidanceReportSchema.safeParse({ factId: "unknown", reason: "outdated", details: "" }).success).toBe(false);
    expect(guidanceReportSchema.safeParse({ factId: "elig-basic", reason: "other", details: "" }).success).toBe(false);
  });
  it("allows a simple reason-only report and bounds optional details", () => {
    expect(guidanceReportSchema.safeParse({ factId: "elig-basic", reason: "inaccurate", details: "" }).success).toBe(true);
    expect(guidanceReportSchema.safeParse({ factId: "elig-basic", reason: "outdated", details: "a".repeat(1001) }).success).toBe(false);
  });
});