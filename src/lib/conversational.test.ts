import { describe, it, expect } from "vitest";
import { isConversational, crisisReply } from "./navigator.functions";
describe("conversational turns", () => {
  it("chat and question turns get no checklist text", () => {
    expect(isConversational("chat")).toBe(true);
    expect(isConversational("question")).toBe(true);
  });
  it("search and refine turns still run the search flow", () => {
    expect(isConversational("search")).toBe(false);
    expect(isConversational("refine")).toBe(false);
    expect(isConversational(undefined)).toBe(false);
  });
  it("crisis reply still lists the Veterans Crisis Line", () => {
    expect(crisisReply("self")).toContain("988");
  });
});
