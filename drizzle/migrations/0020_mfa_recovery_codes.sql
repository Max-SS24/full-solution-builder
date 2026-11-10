CREATE TABLE public.mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mfa_recovery_codes_user_idx ON public.mfa_recovery_codes(user_id);
GRANT ALL ON public.mfa_recovery_codes TO service_role;
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mfa_recovery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mfa_recovery_attempts_user_idx ON public.mfa_recovery_attempts(user_id, created_at);
GRANT ALL ON public.mfa_recovery_attempts TO service_role;
ALTER TABLE public.mfa_recovery_attempts ENABLE ROW LEVEL SECURITY;