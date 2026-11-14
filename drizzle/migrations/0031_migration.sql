CREATE TABLE public.guest_usage (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.guest_usage TO service_role;
ALTER TABLE public.guest_usage ENABLE ROW LEVEL SECURITY;

-- Atomically uses one guest result for every key; returns results left on the
-- strictest key, or -1 (nothing used) when any key is already at its limit.
CREATE OR REPLACE FUNCTION public.use_guest_result(_keys text[], _limits integer[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i int; c int; left_min int := 2147483647;
BEGIN
  FOR i IN 1 .. coalesce(array_length(_keys, 1), 0) LOOP
    INSERT INTO guest_usage(key) VALUES (_keys[i]) ON CONFLICT (key) DO NOTHING;
    SELECT count INTO c FROM guest_usage WHERE key = _keys[i] FOR UPDATE;
    UPDATE guest_usage SET count = 0, window_start = now()
      WHERE key = _keys[i] AND window_start <= now() - interval '24 hours';
    SELECT count INTO c FROM guest_usage WHERE key = _keys[i];
    IF c >= _limits[i] THEN RETURN -1; END IF;
  END LOOP;
  FOR i IN 1 .. coalesce(array_length(_keys, 1), 0) LOOP
    UPDATE guest_usage SET count = count + 1, updated_at = now() WHERE key = _keys[i] RETURNING count INTO c;
    left_min := least(left_min, _limits[i] - c);
  END LOOP;
  DELETE FROM guest_usage WHERE updated_at < now() - interval '2 days';
  RETURN left_min;
END $$;
REVOKE ALL ON FUNCTION public.use_guest_result(text[], integer[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_guest_result(text[], integer[]) TO service_role;