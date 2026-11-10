import { describe, expect, it } from "vitest";
import { lastRecoveryUse, needsFreshCodes, recoveryEventLabel, recoveryNoticeText } from "./recovery-notice";

describe("recovery code usage notice", () => {
  it("records the time of the latest successful recovery sign-in, ignoring failed tries", () => {
    const at = lastRecoveryUse([
      { success: true, created_at: "2026-11-01T10:00:00Z" },
      { success: false, created_at: "2026-11-09T10:00:00Z" },
      { success: true, created_at: "2026-11-05T08:30:00Z" },
    ]);
    expect(at).toBe("2026-11-05T08:30:00Z");
  });

  it("shows the security notice with the usage time on the account page", () => {
    const text = recoveryNoticeText("2026-11-05T08:30:00Z", (d) => d.toISOString());
    expect(text).toContain("2026-11-05T08:30:00.000Z");
    expect(text).toContain("recovery code was used to sign in");
  });

  it("shows no notice when no recovery code has been used", () => {
    expect(lastRecoveryUse([{ success: false, created_at: "2026-11-05T08:30:00Z" }])).toBeNull();
    expect(recoveryNoticeText(null)).toBeNull();
  });

  it("offers a fresh set only when a code was used after the current set was made", () => {
    expect(needsFreshCodes("2026-11-05T08:30:00Z", "2026-11-01T00:00:00Z")).toBe(true);
    expect(needsFreshCodes("2026-11-05T08:30:00Z", "2026-11-06T00:00:00Z")).toBe(false);
    expect(needsFreshCodes(null, "2026-11-06T00:00:00Z")).toBe(false);
  });
});

describe("recovery code activity history", () => {
  it("labels sign-ins, revocations and new sets", () => {
    expect(recoveryEventLabel("sign_in")).toBe("Signed in with a recovery code");
    expect(recoveryEventLabel("revoked")).toBe("Recovery codes revoked");
    expect(recoveryEventLabel("regenerated")).toBe("New recovery codes made");
  });
});
