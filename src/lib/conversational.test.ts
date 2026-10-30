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
import { firstQuestionOnly } from "./navigator.functions";
describe("one question at a time", () => {
  it("keeps only the first question in a reply", () => {
    expect(firstQuestionOnly("Got it, Atlanta. Would a group feel better? And by video?")).toBe("Got it, Atlanta. Would a group feel better?");
  });
});
import { askedTopics, WANTS_RESULTS_RE } from "./navigator.functions";
describe("no repeated questions", () => {
  it("remembers a question about one-on-one vs group was already asked", () => {
    expect(askedTopics([{ role: "assistant", content: "Would one-on-one therapy or a support group feel better?" }]).has("care_type")).toBe(true);
  });
  it("recognizes a request to see results", () => {
    expect(WANTS_RESULTS_RE.test("ok show me")).toBe(true);
    expect(WANTS_RESULTS_RE.test("Phoenix AZ")).toBe(false);
  });
});
