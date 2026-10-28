DROP POLICY IF EXISTS "read active options of enabled sources" ON public.care_options;
CREATE POLICY "read active options of enabled sources" ON public.care_options FOR SELECT TO anon, authenticated
  USING ((status IN ('active','needs_review') AND EXISTS (SELECT 1 FROM public.data_sources s WHERE s.id = care_options.source_id AND s.enabled)) OR public.has_role(auth.uid(), 'admin'));