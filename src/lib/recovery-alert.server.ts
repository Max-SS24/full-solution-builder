/**
 * Email alert when a recovery code is used to sign in.
 * PENDING: no sender domain is configured yet, so this only logs.
 * When a domain is added, scaffold app emails and send a fixed
 * "recovery-code-used" template to the account's own email here.
 * It must never block or fail the sign-in.
 */
export async function notifyRecoveryCodeUsed(userId: string): Promise<void> {
  console.info("[recovery-alert] recovery code used; email alert pending sender domain", { userId });
}
