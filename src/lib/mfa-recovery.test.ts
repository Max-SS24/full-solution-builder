import { describe, expect, it } from "vitest";
import { canResend, formatCountdown, makeRecoveryCode, normalizeRecoveryCode, recoveryLocked, secondsLeft } from "./mfa-rules";

describe("sign-in code timing and recovery", () => {
  it("a code is valid for 10 minutes", () => {
    expect(secondsLeft(0, 0)).toBe(600);
    expect(secondsLeft(0, 600_000)).toBe(0);
    expect(formatCountdown(572)).toBe("9:32");
  });
  it("allows 5 resends after the first send", () => {
    expect(canResend(5)).toBe(true);
    expect(canResend(6)).toBe(false);
  });
  it("locks recovery after 5 wrong tries within 15 minutes", () => {
    const now = 1_000_000_000;
    expect(recoveryLocked([1, 2, 3, 4].map((m) => now - m * 60_000), now)).toBe(false);
    expect(recoveryLocked([1, 2, 3, 4, 5].map((m) => now - m * 60_000), now)).toBe(true);
    expect(recoveryLocked([1, 2, 3, 4, 16].map((m) => now - m * 60_000), now)).toBe(false);
  });
  it("recovery codes are 8 chars and typed loosely", () => {
    const c = makeRecoveryCode(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(normalizeRecoveryCode(" abcd efgh ")).toBe("ABCDEFGH");
  });
});
