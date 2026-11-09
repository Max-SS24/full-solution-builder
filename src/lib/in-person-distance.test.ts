import { expect, it } from "vitest";
import { toOptionRow, wantsDistance, withDistances } from "./care-rules";

it("shows distance only for in-person care with a location", () => {
  expect(wantsDistance({ location: "Atlanta, GA", care_format: "in-person" })).toBe(true);
  expect(wantsDistance({ location: "Atlanta, GA", care_format: "telehealth" })).toBe(false);
  expect(wantsDistance({ location: null, care_format: "in-person" })).toBe(false);
});

it("adds miles from the area center and never invents one without a position", () => {
  const origin = { lat: 33.749, lon: -84.388 };
  const [a, b] = withDistances([{ lat: 33.760211, lon: -84.3880503 }, { lat: null, lon: null }], origin);
  expect(a!.distance_miles).toBe(0.8);
  expect(b!.distance_miles).toBeUndefined();
});

it("saves the listing's map position and whether it is estimated", () => {
  const row = toOptionRow({ id: "npi-1", name: "X", kind: "Private practice", city: "Atlanta", state: "GA", formats: [], needs: [], care_types: [], payment: [], veteran_focus: false, phone: null, source_url: "https://npiregistry.cms.hhs.gov/provider-view/1", verified: true, last_checked: "2026-11-09", source_name: "NPI", lat: 33.7, lon: -84.4, geo_estimated: true }, "s1");
  expect(row).toMatchObject({ lat: 33.7, lon: -84.4, geo_estimated: true });
});
