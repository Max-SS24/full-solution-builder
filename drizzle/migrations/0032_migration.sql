-- When a guest's 24-hour window ends (their free searches come back).
CREATE OR REPLACE FUNCTION public.guest_reset_at(_key text)
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT window_start + interval '24 hours' FROM guest_usage WHERE key = _key
$$;
REVOKE ALL ON FUNCTION public.guest_reset_at(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_reset_at(text) TO service_role;