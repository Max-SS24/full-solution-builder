import { describe, expect, it } from "vitest";
import { isActiveUser, nextStatus } from "./care-rules";

const now = new Date("2026-10-19T12:00:00Z");

describe("active users", () => {
  it("counts a sign-in 29 days ago as active", () => {
    expect(isActiveUser("2026-09-20T12:00:00Z", now)).toBe(true);
  });
  it("counts a sign-in 31 days ago as inactive", () => {
    expect(isActiveUser("2026-09-18T12:00:00Z", now)).toBe(false);
  });
  it("counts a user who never signed in as inactive", () => {
    expect(isActiveUser(null, now)).toBe(false);
  });
});

describe("weekly validation", () => {
  it("keeps a found option active", () => expect(nextStatus(true, "needs_review")).toBe("active"));
  it("flags an active option missing once for review", () => expect(nextStatus(false, "active")).toBe("needs_review"));
  it("removes an option missing two weeks in a row", () => expect(nextStatus(false, "needs_review")).toBe("removed"));
});
