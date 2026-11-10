CREATE OR REPLACE FUNCTION public.recovery_activity()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_mfa_cleared() THEN RAISE EXCEPTION 'Forbidden'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('kind', kind, 'at', created_at) ORDER BY created_at DESC, id DESC) FROM public.mfa_recovery_events WHERE user_id = auth.uid()), '[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.recovery_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recovery_activity() TO authenticated;
CREATE INDEX IF NOT EXISTS mfa_recovery_events_date_idx ON public.mfa_recovery_events(created_at);
CREATE OR REPLACE FUNCTION public.admin_analytics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT jsonb_build_object(
 'total_users', (select count(*) from auth.users),
 'active_users', (select count(*) from auth.users where last_sign_in_at >= now() - interval '30 days'),
 'new_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
 'new_30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
 'searches_total', (select count(*) from public.search_history),
 'searches_7d', (select count(*) from public.search_history where created_at >= now() - interval '7 days'),
 'users_with_prefs', (select count(*) from public.user_preferences where prefs <> '{}'::jsonb),
 'care_options', (select count(*) from public.care_options where status = 'active'),
 'care_options_review', (select count(*) from public.care_options where status = 'needs_review'),
 'top_needs', coalesce((select jsonb_agg(jsonb_build_object('label', k, 'count', c)) from (select variables->>'need' k, count(*) c from public.search_history where coalesce(variables->>'need','') <> '' group by 1 order by 2 desc limit 5) t), '[]'::jsonb),
 'top_locations', coalesce((select jsonb_agg(jsonb_build_object('label', k, 'count', c)) from (select initcap(variables->>'location') k, count(*) c from public.search_history where coalesce(variables->>'location','') <> '' group by 1 order by 2 desc limit 5) t), '[]'::jsonb),
 'recovery_daily', (select jsonb_agg(jsonb_build_object('day', d.date_bucket::date, 'sign_in', coalesce(e.sign_in,0), 'revoked', coalesce(e.revoked,0), 'regenerated', coalesce(e.regenerated,0)) order by d.date_bucket) from generate_series((now() at time zone 'UTC')::date - 89, (now() at time zone 'UTC')::date, interval '1 day') d(date_bucket) left join (select (created_at at time zone 'UTC')::date AS date_bucket, count(*) filter(where kind='sign_in') AS sign_in, count(*) filter(where kind='revoked') AS revoked, count(*) filter(where kind='regenerated') AS regenerated from public.mfa_recovery_events where created_at >= (((now() at time zone 'UTC')::date - 89)::timestamp at time zone 'UTC') group by 1) e on e.date_bucket=d.date_bucket::date),
 'reported_at', now()
 ) INTO r;
 RETURN r;
END; $$;
REVOKE ALL ON FUNCTION public.admin_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics() TO authenticated;