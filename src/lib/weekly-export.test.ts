import { expect, it } from "vitest";
import { buildCsv, rangeData, type ExportCheck } from "./weekly-export";

const mk = (id: number, week: string, status: string, name = `P${id}`): ExportCheck => ({ id, week_start: week, provider_name: name, city: "Atlanta", state: "GA", homepage_status: status, redirected_to: null, care_status: "listed", care_reason: null, homepage_url: null, source_url: "https://findtreatment.gov/locator", checked_at: `${week}T12:00:00Z` });
const all = [
  mk(1, "2026-10-18", "unavailable"), mk(2, "2026-10-25", "unexpected_redirect"), mk(3, "2026-10-25", "unconfirmed"),
  mk(4, "2026-11-01", "working"), mk(5, "2026-11-01", "unavailable"), mk(6, "2026-11-08", "unavailable"),
];
const parse = (csv: string) => csv.split("\r\n").map((l) => l ? l.slice(1, -1).split('","') : []);

it("CSV trend rows match preview trend totals for the range", () => {
  const d = rangeData(all, "2026-10-25", "2026-11-01");
  expect(d.trends).toEqual([
    { week: "2026-10-25", checked: 2, unavailable: 0, redirects: 1, unconfirmed: 1 },
    { week: "2026-11-01", checked: 2, unavailable: 1, redirects: 0, unconfirmed: 0 },
  ]);
  const lines = parse(buildCsv(d));
  expect(lines.slice(4, 6)).toEqual(d.trends.map((t) => [t.week, t.checked, t.unavailable, t.redirects, t.unconfirmed].map(String)));
});

it("CSV result rows equal preview results in the same order, excluding outside weeks", () => {
  const d = rangeData(all, "2026-10-25", "2026-11-01");
  expect(d.rows.map((r) => r.id)).toEqual([2, 3, 4, 5]);
  const results = parse(buildCsv(d)).slice(8);
  expect(results.map((r) => r[1])).toEqual(["P2", "P3", "P4", "P5"]);
});

it("reversed range gives identical output", () => {
  expect(buildCsv(rangeData(all, "2026-11-01", "2026-10-25"))).toBe(buildCsv(rangeData(all, "2026-10-25", "2026-11-01")));
});

it("neutralizes spreadsheet formulas", () => {
  const csv = buildCsv(rangeData([mk(9, "2026-11-08", "working", "=HYPERLINK(1)")], "2026-11-08", "2026-11-08"));
  expect(csv).toContain(`"'=HYPERLINK(1)"`);
});
