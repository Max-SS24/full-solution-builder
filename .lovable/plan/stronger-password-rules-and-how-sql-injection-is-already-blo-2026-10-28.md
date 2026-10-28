# Stronger password rules (and how SQL injection is already blocked)

## Important note
Password rules don't stop SQL injection. Passwords are never put into a database query as text. They are scrambled (hashed) before they're stored, and every query in VA Navigator sends user input separately from the query itself, so typed symbols can't run as commands. Strong password rules still matter, because they protect accounts from being guessed or stolen.

## What will change
1. **Password rules on the Sign up page**:
   - At least 12 characters, and no more than 72
   - At least one uppercase letter, one lowercase letter, one number and one symbol
   - No spaces at the start or end, and the password can't be your email
2. **Live checklist** under the password box that ticks off each rule as the person types. Sign up stays disabled until every rule is met.
3. **Leaked-password block**: the sign-in service rejects passwords that have shown up in known data breaches.
4. **Email check**: email is trimmed and checked for a valid format, with a length limit, before it's sent.
5. **Privacy & security page**: a short new section explaining the password rules and how SQL injection is prevented.

## Technical details
- New `src/lib/password-rules.ts` with a zod schema plus a `checkPassword()` helper that returns the status of each rule. `src/routes/auth.tsx` uses it during sign-up (sign-in stays unchanged so existing users can still log in).
- Turn on the leaked-password check with `configure_auth` (`password_hibp_enabled: true`) and keep the other auth settings as they are.
- Add `src/lib/password-rules.test.ts`, with one test for each rule.
- Add a note to `AGENTS.md`: password rules live in `password-rules.ts`, and queries are parameterized only, with no raw SQL built from user input.
