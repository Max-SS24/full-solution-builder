CREATE TABLE public.certificate_recoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_option_id uuid NOT NULL REFERENCES public.care_options(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  city text,
  state text,
  homepage_url text,
  new_status text NOT NULL,
  recovered_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid
);
GRANT SELECT ON public.certificate_recoveries TO authenticated;
GRANT ALL ON public.certificate_recoveries TO service_role;
ALTER TABLE public.certificate_recoveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read certificate recoveries" ON public.certificate_recoveries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX certificate_recoveries_open ON public.certificate_recoveries (recovered_at DESC) WHERE acknowledged_at IS NULL;

CREATE OR REPLACE FUNCTION public.cert_unverified(_c jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(_c->>'certificate', '') = 'unverified' OR COALESCE(_c->>'reason', '') ILIKE '%couldn''t verify this site''s security certificate%'
$$;

CREATE OR REPLACE FUNCTION public.note_certificate_recovery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.cert_unverified(OLD.homepage_check) AND NEW.homepage_check IS NOT NULL AND NOT public.cert_unverified(NEW.homepage_check) THEN
    INSERT INTO public.certificate_recoveries (care_option_id, provider_name, city, state, homepage_url, new_status)
    VALUES (NEW.id, NEW.name, NEW.city, NEW.state, NEW.homepage_check->>'url', COALESCE(NEW.homepage_check->>'status', 'unknown'));
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.note_certificate_recovery() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER care_options_certificate_recovery
AFTER UPDATE OF homepage_check ON public.care_options
FOR EACH ROW WHEN (NEW.va_vs_community = 'community')
EXECUTE FUNCTION public.note_certificate_recovery();

CREATE OR REPLACE FUNCTION public.acknowledge_certificate_recovery(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.certificate_recoveries SET acknowledged_at = now(), acknowledged_by = auth.uid()
  WHERE id = _id AND acknowledged_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.acknowledge_certificate_recovery(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_certificate_recovery(uuid) TO authenticated;