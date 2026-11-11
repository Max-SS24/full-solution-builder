CREATE TABLE public.appointment_guidance_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id text NOT NULL,
  finding text NOT NULL,
  source_url text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('outdated', 'inaccurate', 'source_mismatch')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, UPDATE ON public.appointment_guidance_reports TO authenticated;
GRANT ALL ON public.appointment_guidance_reports TO service_role;
ALTER TABLE public.appointment_guidance_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read guidance reports" ON public.appointment_guidance_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins review guidance reports" ON public.appointment_guidance_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX appointment_guidance_reports_created_idx ON public.appointment_guidance_reports (created_at DESC);
COMMENT ON TABLE public.appointment_guidance_reports IS 'Public guidance feedback submitted only through a validated server function; no account, contact, or search data is collected. Admin-only review does not change fact verification.';