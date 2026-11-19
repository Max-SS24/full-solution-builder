CREATE TABLE public.a11y_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('server','browser')),
  ok boolean NOT NULL,
  passed int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  ran_by uuid,
  ran_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.a11y_audit_runs TO authenticated;
GRANT ALL ON public.a11y_audit_runs TO service_role;
ALTER TABLE public.a11y_audit_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read a11y runs" ON public.a11y_audit_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins log browser runs" ON public.a11y_audit_runs FOR INSERT TO authenticated WITH CHECK (kind = 'browser' AND ran_by = auth.uid() AND public.has_role(auth.uid(), 'admin'));
CREATE INDEX a11y_audit_runs_ran_at ON public.a11y_audit_runs (ran_at DESC);