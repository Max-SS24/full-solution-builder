CREATE OR REPLACE FUNCTION public.admin_analytics(_from date, _to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; lo timestamptz; hi timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _from IS NULL OR _to IS NULL OR _from > _to THEN RAISE EXCEPTION 'Invalid date range'; END IF;
 lo := _from::timestamp AT TIME ZONE 'UTC'; hi := (_to + 1)::timestamp AT TIME ZONE 'UTC';
 r := public.admin_analytics();
 RETURN r || jsonb_build_object(
 'range_from', _from, 'range_to', _to,
 'signups_period', (select count(*) from auth.users where created_at >= lo and created_at < hi),
 'searches_period', (select count(*) from public.search_history where created_at >= lo and created_at < hi),
 'top_needs', coalesce((select jsonb_agg(jsonb_build_object('label', k, 'count', c)) from (select variables->>'need' k, count(*) c from public.search_history where created_at >= lo and created_at < hi and coalesce(variables->>'need','') <> '' group by 1 order by 2 desc limit 5) t), '[]'::jsonb),
 'top_locations', coalesce((select jsonb_agg(jsonb_build_object('label', k, 'count', c)) from (select initcap(variables->>'location') k, count(*) c from public.search_history where created_at >= lo and created_at < hi and coalesce(variables->>'location','') <> '' group by 1 order by 2 desc limit 5) t), '[]'::jsonb),
 'activity_daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d.bucket::date, 'signups', coalesce(u.n,0), 'searches', coalesce(s.n,0)) order by d.bucket),'[]'::jsonb) from generate_series(_from::timestamp, _to::timestamp, interval '1 day') d(bucket) left join (select (created_at at time zone 'UTC')::date bucket,count(*) n from auth.users where created_at >= lo and created_at < hi group by 1) u on u.bucket=d.bucket::date left join (select (created_at at time zone 'UTC')::date bucket,count(*) n from public.search_history where created_at >= lo and created_at < hi group by 1) s on s.bucket=d.bucket::date),
 'recovery_daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d.bucket::date, 'sign_in', coalesce(e.sign_in,0), 'revoked', coalesce(e.revoked,0), 'regenerated', coalesce(e.regenerated,0)) order by d.bucket),'[]'::jsonb) from generate_series(_from::timestamp, _to::timestamp, interval '1 day') d(bucket) left join (select (created_at at time zone 'UTC')::date bucket, count(*) filter(where kind='sign_in') sign_in, count(*) filter(where kind='revoked') revoked, count(*) filter(where kind='regenerated') regenerated from public.mfa_recovery_events where created_at >= lo and created_at < hi group by 1) e on e.bucket=d.bucket::date)
 );
END; $$;
REVOKE ALL ON FUNCTION public.admin_analytics(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics(date,date) TO authenticated;