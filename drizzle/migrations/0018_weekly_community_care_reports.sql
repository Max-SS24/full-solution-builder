ALTER TABLE public.care_options ADD COLUMN care_check jsonb, ADD COLUMN care_checked_at timestamptz;
COMMENT ON COLUMN public.care_options.care_check IS 'Authoritative community source evidence; active registration does not prove appointments or ongoing services. Website failures never imply care closure.';
CREATE TABLE public.community_check_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 care_option_id uuid NOT NULL REFERENCES public.care_options(id) ON DELETE CASCADE,
 week_start date NOT NULL,
 checked_at timestamptz NOT NULL,
 provider_name text NOT NULL,
 city text, state text,
 homepage_url text,
 homepage_status text NOT NULL CHECK (homepage_status IN ('working','unavailable','unexpected_redirect','unconfirmed','no_homepage')),
 redirected_to text,
 care_status text NOT NULL CHECK (care_status IN ('listed','inactive_registration','unconfirmed')),
 care_reason text NOT NULL,
 source_url text NOT NULL,
 UNIQUE(care_option_id,week_start)
);
GRANT SELECT ON public.community_check_history TO authenticated;
GRANT ALL ON public.community_check_history TO service_role;
ALTER TABLE public.community_check_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read community check history" ON public.community_check_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX community_check_history_week_idx ON public.community_check_history(week_start DESC);
CREATE INDEX care_options_community_care_due_idx ON public.care_options(care_checked_at) WHERE va_vs_community='community' AND status IN ('active','needs_review');