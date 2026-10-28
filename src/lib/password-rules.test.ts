import { describe, it, expect } from "vitest";
import { checkPassword, emailSchema } from "./password-rules";

const ok = (p: string, id: string, email = "") => checkPassword(p, email).results.find((r) => r.id === id)!.ok;

describe("password rules", () => {
  it("accepts a strong password", () => expect(checkPassword("Veteran#2026ok").valid).toBe(true));
  it("needs 12+ chars", () => { expect(ok("Ab1!abcdefg", "length")).toBe(false); expect(ok("Ab1!abcdefgh", "length")).toBe(true); });
  it("max 72 chars", () => expect(ok("A1!" + "a".repeat(70), "length")).toBe(false));
  it("needs uppercase", () => expect(ok("veteran#2026ok", "upper")).toBe(false));
  it("needs lowercase", () => expect(ok("VETERAN#2026OK", "lower")).toBe(false));
  it("needs number", () => expect(ok("Veteran#abcdok", "number")).toBe(false));
  it("needs symbol", () => expect(ok("Veteran2026ok", "symbol")).toBe(false));
  it("no edge spaces", () => expect(ok(" Veteran#2026ok", "spaces")).toBe(false));
  it("not the email", () => expect(ok("Me@Vet-2026.com", "email", "me@vet-2026.com")).toBe(false));
  it("validates email", () => { expect(emailSchema.safeParse("bad").success).toBe(false); expect(emailSchema.safeParse(" a@b.co ").success).toBe(true); });
});
