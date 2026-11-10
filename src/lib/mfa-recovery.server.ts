import { normalizeRecoveryCode } from "./mfa-rules";

/** SHA-256 of user id + normalized code; codes are never stored in plain text. */
export async function hashRecoveryCode(userId: string, code: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${userId}:${normalizeRecoveryCode(code)}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
