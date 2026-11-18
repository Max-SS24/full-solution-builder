// Shape of the "Download my data" file. Only fields chosen here are exported; never secrets or code hashes.
export function buildDataExport(p: {
  userId: string; email: string | null; prefs: unknown; history: unknown[];
  security: { email_mfa?: boolean; updated_at?: string } | null; recovery: unknown[]; now?: Date;
}): string {
  return JSON.stringify({
    exported_at: (p.now ?? new Date()).toISOString(),
    account: { id: p.userId, email: p.email },
    preferences: p.prefs ?? null,
    search_history: p.history,
    sign_in_security: p.security ? { email_mfa: !!p.security.email_mfa, updated_at: p.security.updated_at ?? null } : null,
    recovery_code_activity: p.recovery,
  }, null, 2);
}
