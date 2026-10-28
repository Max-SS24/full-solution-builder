import { z } from "zod";

export const PASSWORD_RULES = [
  { id: "length", label: "12 to 72 characters", test: (p: string) => p.length >= 12 && p.length <= 72 },
  { id: "upper", label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "A number", test: (p: string) => /[0-9]/.test(p) },
  { id: "symbol", label: "A symbol (like ! @ # $)", test: (p: string) => /[^A-Za-z0-9\s]/.test(p) },
  { id: "spaces", label: "No spaces at the start or end", test: (p: string) => p.length > 0 && p === p.trim() },
] as const;

export function checkPassword(password: string, email = "") {
  const results = PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(password) }));
  const e = email.trim().toLowerCase();
  results.push({
    id: "email",
    label: "Not the same as your email",
    ok: password.length > 0 && (!e || password.toLowerCase() !== e),
  });
  return { results, valid: results.every((r) => r.ok) };
}

export const emailSchema = z.string().trim().email("Enter a valid email address").max(255);
