import { describe, it, expect } from "vitest";
import { milesBetween, sortByDistance, reviewReason, newFacilityUrls } from "./care-rules";

describe("VA distance and review rules", () => {
  it("Atlanta VAMC to downtown Atlanta is about 6 miles", () => {
    expect(milesBetween({ lat: 33.801939, lon: -84.3130305 }, { lat: 33.749, lon: -84.388 })).toBeCloseTo(5.68, 0);
  });
  it("sorts nearest first, unknown distance last", () => {
    expect(sortByDistance([{ distance_miles: 9 }, { distance_miles: null }, { distance_miles: 2 }]).map((r) => r.distance_miles)).toEqual([2, 9, null]);
  });
  it("missing page flags review", () => expect(reviewReason("needs_review", null)).toBe("page_missing"));
  it("contact change flagged for 7 days", () => {
    const now = new Date("2026-11-01T12:00:00Z");
    expect(reviewReason("active", "2026-10-28T12:00:00Z", now)).toBe("contact_changed");
    expect(reviewReason("active", "2026-10-20T12:00:00Z", now)).toBeNull();
  });
  it("finds only new facility pages", () => {
    const xml = "<loc>https://www.va.gov/atlanta-health-care/locations/new-clinic</loc><loc>https://www.va.gov/atlanta-health-care/locations/old/</loc><loc>https://www.va.gov/atlanta-health-care/events/x/</loc>";
    expect(newFacilityUrls(xml, new Set(["https://www.va.gov/atlanta-health-care/locations/old/"]))).toEqual(["https://www.va.gov/atlanta-health-care/locations/new-clinic/"]);
  });
});
