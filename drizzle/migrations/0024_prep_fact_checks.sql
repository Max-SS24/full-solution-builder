CREATE TABLE public.prep_fact_checks (
  fact_id text PRIMARY KEY,
  source_url text NOT NULL,
  ok boolean NOT NULL,
  http_status integer,
  checked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prep_fact_checks TO anon, authenticated;
GRANT ALL ON public.prep_fact_checks TO service_role;
ALTER TABLE public.prep_fact_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read guidance source checks" ON public.prep_fact_checks FOR SELECT TO anon, authenticated USING (true);