import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { analyticsCsv, recoveryHistoryCsv, recoveryTotals, recoveryTrendsCsv, type AnalyticsStats } from "./activity-reports";

const days = [
  { day: "2026-11-09", sign_in: 2, revoked: 1, regenerated: 3 },
  { day: "2026-11-10", sign_in: 4, revoked: 0, regenerated: 1 },
];
describe("recovery reports", () => {
  it("exports all three event types with exact UTC timestamps, without a 50-event cap", () => {
    const events = Array.from({ length: 60 }, (_, i) => ({ kind: i % 3 === 0 ? "sign_in" : i % 3 === 1 ? "revoked" : "regenerated", at: "2026-11-10T01:30:00-05:00" }));
    const csv = recoveryHistoryCsv(events);
    expect(csv.split("\r\n")).toHaveLength(61);
    for (const kind of ["sign_in", "revoked", "regenerated"]) expect(csv).toContain(`"${kind}","2026-11-10T06:30:00.000Z"`);
  });
  it("uses the same daily counts for the chart totals and CSV", () => {
    expect(recoveryTotals(days)).toEqual({ sign_in: 6, revoked: 1, regenerated: 4 });
    expect(recoveryTrendsCsv(days, "2026-11-10T06:00:00Z")).toContain('"2026-11-09","2","1","3","2026-11-10T06:00:00Z"');
    expect(recoveryTotals(days.slice(-1))).toEqual({ sign_in: 4, revoked: 0, regenerated: 1 });
  });
  it("exports summary totals and both rankings safely", () => {
    const stats: AnalyticsStats = { total_users: 10, active_users: 6, new_7d: 1, new_30d: 3, searches_total: 12, searches_7d: 4, users_with_prefs: 5, care_options: 1603, care_options_review: 2, top_needs: [{ label: '=HYPERLINK("bad")', count: 2 }], top_locations: [{ label: "Atlanta", count: 7 }], recovery_daily: days, reported_at: "2026-11-10T06:00:00Z" };
    const csv = analyticsCsv(stats);
    expect(csv).toContain('"Current snapshot","Inactive users","4"');
    expect(csv).toContain('"Most searched locations","Atlanta","7"');
    expect(csv).toContain('"Most requested needs","\'=HYPERLINK(""bad"")","2"');
    expect(csv.split("\r\n")).toHaveLength(13);
  });
  it("requires admin access for aggregate recovery analytics", () => {
    const sql = readFileSync("drizzle/migrations/0022_recovery_activity_reports.sql", "utf8");
    const body = sql.split("CREATE OR REPLACE FUNCTION public.admin_analytics()")[1];
    expect(body).toMatch(/auth.uid\(\) IS NULL OR NOT public.has_role\(auth.uid\(\), 'admin'\)/);
    expect(body).toContain("REVOKE ALL ON FUNCTION public.admin_analytics() FROM PUBLIC, anon");
    expect(body).not.toContain("'user_id'");
  });
  it("restricts complete activity history to the signed-in owner with MFA cleared", () => {
    const body = readFileSync("drizzle/migrations/0022_recovery_activity_reports.sql", "utf8").split("CREATE INDEX")[0];
    expect(body).toContain("auth.uid() IS NULL OR NOT public.has_mfa_cleared()");
    expect(body).toContain("WHERE user_id = auth.uid()");
    expect(body).toContain("REVOKE ALL ON FUNCTION public.recovery_activity() FROM PUBLIC, anon");
    expect(body).not.toMatch(/limit\s+50/i);
  });
});