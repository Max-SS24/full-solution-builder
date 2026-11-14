import { beforeEach, describe, expect, it } from "vitest";
import { currentGuestCounter, readGuestCounter, updateGuestCounter } from "@/lib/guest-counter";
import { GUEST_TOKEN_KEY } from "@/lib/guest-limit";

describe("guest remaining-search counter", () => {
  beforeEach(() => localStorage.clear());
  it("starts a new guest with five searches", () => { expect(readGuestCounter()?.remaining).toBe(5); });
  it("retains the server count after the fourth result across reloads", () => {
    updateGuestCounter(1, "2099-11-15T03:00:00Z");
    expect(readGuestCounter()?.remaining).toBe(1);
  });
  it("shows zero once the allowance is exhausted", () => {
    updateGuestCounter(0, "2099-11-15T03:00:00Z");
    expect(readGuestCounter()?.remaining).toBe(0);
  });
  it("does not change the counter on conversation-only turns", () => {
    updateGuestCounter(3, "2099-11-15T03:00:00Z"); updateGuestCounter(null);
    expect(readGuestCounter()?.remaining).toBe(3);
  });
  it("restores five searches at the 24-hour reset time", () => {
    const start = Date.parse("2026-11-14T03:00:00Z");
    const value = { remaining: 0, resetAt: "2026-11-15T03:00:00Z" };
    expect(currentGuestCounter(value, start + 24 * 60 * 60 * 1000 - 1)?.remaining).toBe(0);
    expect(currentGuestCounter(value, start + 24 * 60 * 60 * 1000)?.remaining).toBe(5);
  });
  it("does not invent a remaining count for an existing guest without a cached count", () => {
    localStorage.setItem(GUEST_TOKEN_KEY, "existing-guest-token");
    expect(readGuestCounter()).toBeNull();
  });
});