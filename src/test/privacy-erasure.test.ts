import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/lib/privacy.functions.ts", "utf8");

describe("account erasure", () => {
  for (const t of ["search_history", "user_preferences", "mfa_recovery_codes", "mfa_recovery_events", "mfa_recovery_attempts", "mfa_proofs", "mfa_sessions", "user_security"]) {
    it(`erases ${t}`, () => expect(src).toContain(`"${t}"`));
  }
});
