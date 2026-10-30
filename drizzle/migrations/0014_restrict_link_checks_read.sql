DROP POLICY IF EXISTS "Anyone can read link checks" ON public.link_checks;
CREATE POLICY "Read checks of official helpful links" ON public.link_checks
FOR SELECT TO anon, authenticated
USING (url ~ '^https://([a-z0-9-]+\.)*(va\.gov|samhsa\.gov|findtreatment\.gov|988lifeline\.org)(/|$)' OR public.has_role(auth.uid(), 'admin'::app_role));