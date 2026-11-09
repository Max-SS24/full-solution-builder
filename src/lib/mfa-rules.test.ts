import { expect, it } from "vitest";
import { amrMethods, MAX_CODE_TRIES, PROOF_WINDOW_MS, recentCode } from "./mfa-rules";

const now = 1_800_000_000_000;
it("accepts a code entered within 10 minutes", () => {
  expect(recentCode([{ method: "otp", timestamp: now / 1000 - 9 * 60 }], now)).toBe(true);
});
it("rejects a code older than 10 minutes", () => {
  expect(PROOF_WINDOW_MS).toBe(600000);
  expect(recentCode([{ method: "otp", timestamp: now / 1000 - 11 * 60 }], now)).toBe(false);
});
it("a password-only session does not count as a code", () => {
  expect(recentCode([{ method: "password", timestamp: now / 1000 }], now)).toBe(false);
  expect(amrMethods([{ method: "password" }])).toEqual(["password"]);
});
it("allows 5 code attempts", () => expect(MAX_CODE_TRIES).toBe(5));
