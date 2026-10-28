CREATE TABLE public.link_checks (
  url text PRIMARY KEY,
  ok boolean NOT NULL DEFAULT false,
  http_status integer,
  checked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.link_checks TO anon, authenticated;
GRANT ALL ON public.link_checks TO service_role;
ALTER TABLE public.link_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read link checks" ON public.link_checks FOR SELECT TO anon, authenticated USING (true);