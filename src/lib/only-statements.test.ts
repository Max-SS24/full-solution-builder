import { describe, it, expect } from "vitest";
import { onlyStatements } from "./navigator.functions";
describe("onlyStatements", () => {
  it("removes extra questions so results prompt is the only question", () => {
    expect(onlyStatements("Got it, PTSD in Atlanta. Do you prefer groups? What insurance do you have?")).toBe("Got it, PTSD in Atlanta.");
  });
});
