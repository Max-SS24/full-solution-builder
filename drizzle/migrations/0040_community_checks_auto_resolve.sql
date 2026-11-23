ALTER TABLE public.community_check_history
  ADD COLUMN auto_resolved_at timestamptz,
  ADD COLUMN auto_resolved_note text;

-- Returns a note when the provider's latest saved checks are newer than this failed result and pass every part that failed; otherwise null.
CREATE OR REPLACE FUNCTION public.community_newer_pass(_h public.community_check_history, _o public.care_options)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  WITH s AS (
    SELECT
      _h.homepage_status IN ('unavailable','unexpected_redirect','unconfirmed') AS site_failed,
      _h.care_status <> 'listed' AS care_failed,
      COALESCE(_o.homepage_check->>'status', '') = 'working'
        AND _o.homepage_checked_at > COALESCE(GREATEST(_h.deep_checked_at, _h.checked_at), _h.checked_at) AS site_ok,
      COALESCE(_o.care_check->>'status', '') = 'listed'
        AND _o.care_checked_at > COALESCE(GREATEST(_h.deep_checked_at, _h.checked_at), _h.checked_at) AS care_ok
  )
  SELECT CASE
    WHEN NOT (site_failed OR care_failed) THEN NULL
    WHEN (site_failed AND NOT site_ok) OR (care_failed AND NOT care_ok) THEN NULL
    ELSE 'A newer check passed: ' || concat_ws(' and ',
      CASE WHEN site_failed THEN 'the website works' END,
      CASE WHEN care_failed THEN 'services are still listed' END)
  END FROM s
$$;
REVOKE ALL ON FUNCTION public.community_newer_pass(public.community_check_history, public.care_options) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.resolve_community_checks_on_pass()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.community_check_history h
     SET auto_resolved_at = now(), auto_resolved_note = public.community_newer_pass(h, NEW)
   WHERE h.care_option_id = NEW.id AND h.auto_resolved_at IS NULL AND h.manual_validated_at IS NULL
     AND public.community_newer_pass(h, NEW) IS NOT NULL;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.resolve_community_checks_on_pass() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER care_options_resolve_community_checks
AFTER UPDATE OF homepage_check, care_check ON public.care_options
FOR EACH ROW WHEN (NEW.va_vs_community = 'community')
EXECUTE FUNCTION public.resolve_community_checks_on_pass();

-- Resolve failed results that already have a newer passing check.
UPDATE public.community_check_history h
   SET auto_resolved_at = now(), auto_resolved_note = public.community_newer_pass(h, o)
  FROM public.care_options o
 WHERE o.id = h.care_option_id AND h.auto_resolved_at IS NULL AND h.manual_validated_at IS NULL
   AND public.community_newer_pass(h, o) IS NOT NULL;