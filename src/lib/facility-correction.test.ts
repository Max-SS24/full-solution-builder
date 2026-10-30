import { describe, it, expect } from "vitest";
import { correctFacility, addressOf } from "./navigator.functions";

describe("VA facility correction", () => {
  it("reads a new facility name from a correction", () => {
    expect(correctFacility("My VA facility is actually Bay Pines VA Healthcare System")).toBe("Bay Pines VA Healthcare System");
  });
  it("asks again when they only say it's wrong", () => {
    expect(correctFacility("That's not my facility")).toBe("ask");
  });
  it("ignores ordinary messages", () => {
    expect(correctFacility("I'd like video visits")).toBeNull();
  });
});

describe("VA facility address", () => {
  it("takes the street address from the listing description", () => {
    expect(addressOf("13000 Bruce B. Downs Blvd, Tampa, FL 33612. Address and phone from this facility's official VA.gov page; re-checked every Sunday."))
      .toBe("13000 Bruce B. Downs Blvd, Tampa, FL 33612");
  });
});
