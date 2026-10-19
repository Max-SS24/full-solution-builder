import { describe, it, expect } from "vitest";
import { dangerOf, crisisReply } from "./navigator.functions";

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

describe("crisis reply structure", () => {
  it("opens with glad-you-told-me, lists each contact as a bullet, then the safety check", () => {
    const reply = crisisReply("self");
    const lines = reply.split("\n");
    expect(lines[0]).toContain("I'm glad you told me.");
    expect(lines[0]).toContain("Your life is precious");
    expect(lines.filter((l) => l.startsWith("• "))).toHaveLength(6);
    expect(lines.at(-1)).toContain("Are you in immediate danger");
    expect(lines.at(-1)).toContain("call 911 or go to the nearest emergency department");
  });
  it("uses everyone's-safety wording when the danger is to others", () => {
    const reply = crisisReply("others");
    expect(reply).toContain("everyone's safety, including yours");
  });
});
