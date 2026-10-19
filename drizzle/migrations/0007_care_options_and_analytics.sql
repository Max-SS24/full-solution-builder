create table public.care_options (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete cascade,
  external_id text not null,
  name text not null,
  kind text not null,
  city text,
  state text,
  va_vs_community text not null default 'community' check (va_vs_community in ('va','community')),
  insurance text[] not null default '{}',
  formats text[] not null default '{}',
  needs text[] not null default '{}',
  care_types text[] not null default '{}',
  veteran_focus boolean not null default false,
  phone text,
  website text not null,
  bio text,
  status text not null default 'active' check (status in ('active','needs_review','removed')),
  first_seen date not null default current_date,
  last_validated date not null default current_date,
  updated_at timestamptz not null default now(),
  unique (source_id, external_id)
);
create index care_options_area_idx on public.care_options (state, city, va_vs_community);
grant select on public.care_options to anon, authenticated;
grant all on public.care_options to service_role;
alter table public.care_options enable row level security;
create policy "read active options of enabled sources" on public.care_options for select to anon, authenticated
  using ((status = 'active' and exists (select 1 from public.data_sources s where s.id = care_options.source_id and s.enabled))
         or public.has_role(auth.uid(), 'admin'));

create or replace function public.log_validation_run(_details jsonb) returns void
language sql security definer set search_path = public as $$
  insert into public.audit_log(actor_id, actor_email, action, entity, entity_id, details)
  values (null, 'weekly check', 'validate', 'care_options', null, _details);
$$;
revoke execute on function public.log_validation_run(jsonb) from public, anon, authenticated;
grant execute on function public.log_validation_run(jsonb) to service_role;

create or replace function public.admin_analytics() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'active_users', (select count(*) from auth.users where last_sign_in_at >= now() - interval '30 days'),
    'new_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'new_30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'searches_total', (select count(*) from public.search_history),
    'searches_7d', (select count(*) from public.search_history where created_at >= now() - interval '7 days'),
    'users_with_prefs', (select count(*) from public.user_preferences where prefs <> '{}'::jsonb),
    'care_options', (select count(*) from public.care_options where status = 'active'),
    'care_options_review', (select count(*) from public.care_options where status = 'needs_review'),
    'top_needs', coalesce((select jsonb_agg(jsonb_build_object('label', k, 'count', c)) from (
        select variables->>'need' k, count(*) c from public.search_history where coalesce(variables->>'need','') <> '' group by 1 order by 2 desc limit 5) t), '[]'::jsonb),
    'top_locations', coalesce((select jsonb_agg(jsonb_build_object('label', k, 'count', c)) from (
        select initcap(variables->>'location') k, count(*) c from public.search_history where coalesce(variables->>'location','') <> '' group by 1 order by 2 desc limit 5) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke execute on function public.admin_analytics() from public, anon;
grant execute on function public.admin_analytics() to authenticated;