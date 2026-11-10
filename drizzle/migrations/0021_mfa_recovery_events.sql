CREATE TABLE public.mfa_recovery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('sign_in','revoked','regenerated')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mfa_recovery_events_user_idx ON public.mfa_recovery_events(user_id, created_at DESC);
GRANT ALL ON public.mfa_recovery_events TO service_role;
ALTER TABLE public.mfa_recovery_events ENABLE ROW LEVEL SECURITY;
INSERT INTO public.mfa_recovery_events (user_id, kind, created_at)
  SELECT user_id, 'sign_in', created_at FROM public.mfa_recovery_attempts WHERE success;