import { describe, it, expect } from "vitest";
import { GUEST_DAILY_RESULTS, guestNotice, countsAsGuestResult } from "@/lib/guest-limit";

describe("guest search limit", () => {
  it("allows 5 result sets per day", () => { expect(GUEST_DAILY_RESULTS).toBe(5); });
  it("warns after the 4th result (one left)", () => { expect(guestNotice(1)).toMatch(/1 free search left/); });
  it("says nothing earlier", () => { expect(guestNotice(4)).toBeNull(); expect(guestNotice(2)).toBeNull(); expect(guestNotice(null)).toBeNull(); });
  it("tells them after the 5th that it was the last", () => { expect(guestNotice(0)).toMatch(/last free search/); });
  it("counts only newly offered results, never crisis or chat turns", () => {
    expect(countsAsGuestResult(true, false, false)).toBe(true);
    expect(countsAsGuestResult(true, false, true)).toBe(false);
    expect(countsAsGuestResult(true, true, false)).toBe(false);
    expect(countsAsGuestResult(false, false, false)).toBe(false);
  });
});
