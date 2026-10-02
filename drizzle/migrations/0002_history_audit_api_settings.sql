create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  reply text not null,
  messages jsonb not null default '[]'::jsonb,
  variables jsonb not null default '{}'::jsonb,
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.search_history(user_id, created_at desc);
grant select, insert, delete on public.search_history to authenticated;
grant all on public.search_history to service_role;
alter table public.search_history enable row level security;
create policy "own history select" on public.search_history for select to authenticated using (user_id = auth.uid());
create policy "own history insert" on public.search_history for insert to authenticated with check (user_id = auth.uid());
create policy "own history delete" on public.search_history for delete to authenticated using (user_id = auth.uid());

create table public.api_settings (
  id int primary key default 1 check (id = 1),
  provider text not null default 'grok',
  model text,
  updated_at timestamptz not null default now()
);
insert into public.api_settings(id) values (1);
grant select, update on public.api_settings to authenticated;
grant all on public.api_settings to service_role;
alter table public.api_settings enable row level security;
create policy "admin read api" on public.api_settings for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin update api" on public.api_settings for update to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.get_ai_settings() returns table(provider text, model text) language sql stable security definer set search_path=public as $$ select provider, model from public.api_settings where id=1 $$;
grant execute on function public.get_ai_settings() to anon, authenticated;

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "admin read audit" on public.audit_log for select to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.audit_changes() returns trigger language plpgsql security definer set search_path=public as $$
declare
  rec_id text;
begin
  rec_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id');
  insert into public.audit_log(actor_id, actor_email, action, entity, entity_id, details)
  values (
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    lower(tg_op),
    tg_table_name,
    rec_id,
    case tg_op
      when 'INSERT' then jsonb_build_object('new', to_jsonb(new))
      when 'DELETE' then jsonb_build_object('old', to_jsonb(old))
      else jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
    end
  );
  return coalesce(new, old);
end $$;

create trigger audit_data_sources after insert or update or delete on public.data_sources for each row execute function public.audit_changes();
create trigger audit_api_settings after update on public.api_settings for each row execute function public.audit_changes();