DROP POLICY IF EXISTS "Read guidance source checks" ON public.prep_fact_checks;
CREATE POLICY "Read checks of official VA guidance sources" ON public.prep_fact_checks FOR SELECT TO anon, authenticated
USING ((source_url ~ '^https://([a-z0-9-]+\.)*va\.gov(/|$)') OR public.has_role(auth.uid(), 'admin'::public.app_role));