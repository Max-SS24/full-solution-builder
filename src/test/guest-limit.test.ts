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

import { resetText, guestLimitReply } from "@/lib/guest-limit";
describe("guest reset time", () => {
  const at = "2026-11-15T02:30:00Z";
  it("shows when searches come back, in the visitor's time zone", () => {
    expect(resetText(at, "America/New_York")).toBe("on Sat, Nov 14 at 9:30 PM EST");
  });
  it("includes the reset time in the warning and limit notices", () => {
    expect(guestNotice(1, at)).toMatch(/come back on /);
    expect(guestNotice(0, at)).toMatch(/come back on /);
    expect(guestLimitReply(at)).toMatch(/They come back on /);
  });
  it("leaves the time out when unknown", () => { expect(resetText(null)).toBeNull(); expect(guestLimitReply(null)).not.toMatch(/come back/); });
});
