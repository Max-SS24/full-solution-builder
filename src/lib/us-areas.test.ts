import { describe, expect, it } from "vitest";
import { AREA_CODES, findNamedArea, isTerritory } from "./us-areas";

describe("U.S. territory coverage", () => {
  it("includes all 5 inhabited territories plus 50 states and DC", () => {
    for (const c of ["PR", "GU", "VI", "AS", "MP"]) expect(isTerritory(c)).toBe(true);
    expect(AREA_CODES.length).toBe(56);
  });
  it("reads territories written out in full", () => {
    expect(findNamedArea("I live in San Juan, Puerto Rico")).toEqual(["San Juan", "PR"]);
    expect(findNamedArea("I'm on Guam")).toEqual(["", "GU"]);
    expect(findNamedArea("near Pago Pago, American Samoa")).toEqual(["Pago Pago", "AS"]);
  });
});
