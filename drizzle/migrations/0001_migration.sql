create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_preferences to authenticated;
grant all on public.user_preferences to service_role;
alter table public.user_preferences enable row level security;
create policy "own prefs select" on public.user_preferences for select to authenticated using (user_id = auth.uid());
create policy "own prefs insert" on public.user_preferences for insert to authenticated with check (user_id = auth.uid());
create policy "own prefs update" on public.user_preferences for update to authenticated using (user_id = auth.uid());
create policy "own prefs delete" on public.user_preferences for delete to authenticated using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select public.has_role(auth.uid(),'admin') $$;
grant execute on function public.is_admin() to authenticated;