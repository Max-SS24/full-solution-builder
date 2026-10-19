import { describe, it, expect } from "vitest";
import { dangerOf } from "./navigator.functions";

describe("danger detection", () => {
  it("flags thinking about hurting myself as self", () => {
    expect(dangerOf("I've been thinking about hurting myself")).toBe("self");
  });
  it("flags thoughts of killing myself as self", () => {
    expect(dangerOf("having thoughts of killing myself")).toBe("self");
  });
  it("flags thinking of hurting someone as others", () => {
    expect(dangerOf("I keep thinking of hurting someone")).toBe("others");
  });
  it("flags wanting to harm others as others", () => {
    expect(dangerOf("I want to harm others")).toBe("others");
  });
  it("does not flag a plain location", () => {
    expect(dangerOf("Atlanta, GA")).toBeNull();
  });
});
