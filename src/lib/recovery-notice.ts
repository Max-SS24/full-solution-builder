/** Rules for the "a recovery code was used" notice on the account page. */

/** Latest successful recovery sign-in time from attempt rows, or null. */
export function lastRecoveryUse(attempts: { success: boolean; created_at: string }[]): string | null {
  let best: string | null = null;
  for (const a of attempts) {
    if (a.success && (!best || Date.parse(a.created_at) > Date.parse(best))) best = a.created_at;
  }
  return best;
}

/** True when a recovery code was used after the current set was made, so a fresh set is advised. */
export function needsFreshCodes(lastUsedAt: string | null, codesCreatedAt: string | null): boolean {
  if (!lastUsedAt) return false;
  if (!codesCreatedAt) return true;
  return Date.parse(lastUsedAt) >= Date.parse(codesCreatedAt);
}

/** Text of the security notice, or null when no recovery code has been used. */
export function recoveryNoticeText(lastUsedAt: string | null, format: (d: Date) => string = (d) => d.toLocaleString()): string | null {
  if (!lastUsedAt) return null;
  return `A recovery code was used to sign in on ${format(new Date(lastUsedAt))}. If that wasn't you, change your password and make new recovery codes.`;
}

const LABELS: Record<string, string> = {
  sign_in: "Signed in with a recovery code",
  revoked: "Recovery codes revoked",
  regenerated: "New recovery codes made",
};

/** Plain label for one recovery-code activity entry. */
export function recoveryEventLabel(kind: string): string {
  return LABELS[kind] ?? "Recovery code activity";
}
