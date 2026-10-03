create or replace function public.list_admins()
returns table(user_id uuid, email text, granted boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  return query select r.user_id, u.email::text, true from public.user_roles r join auth.users u on u.id = r.user_id where r.role='admin' order by u.email;
end $$;

create or replace function public.grant_admin(_email text)
returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(_email)) limit 1;
  if uid is null then raise exception 'No account with that email. Ask them to sign up first.'; end if;
  if public.has_role(uid,'admin') then return 'already'; end if;
  insert into public.user_roles(user_id, role) values (uid,'admin');
  insert into public.audit_log(actor_id, actor_email, action, entity, entity_id, details)
  values (auth.uid(), (select email from auth.users where id=auth.uid()), 'insert', 'admin_roles', uid::text, jsonb_build_object('new', jsonb_build_object('name', lower(trim(_email)))));
  return 'granted';
end $$;

create or replace function public.revoke_admin(_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare em text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  if _user_id = auth.uid() then raise exception 'You cannot remove your own admin access.'; end if;
  if (select count(*) from public.user_roles where role='admin') <= 1 then raise exception 'At least one admin is required.'; end if;
  select email into em from auth.users where id=_user_id;
  delete from public.user_roles where user_id=_user_id and role='admin';
  insert into public.audit_log(actor_id, actor_email, action, entity, entity_id, details)
  values (auth.uid(), (select email from auth.users where id=auth.uid()), 'delete', 'admin_roles', _user_id::text, jsonb_build_object('old', jsonb_build_object('name', em)));
end $$;

revoke execute on function public.list_admins() from anon, public;
revoke execute on function public.grant_admin(text) from anon, public;
revoke execute on function public.revoke_admin(uuid) from anon, public;
grant execute on function public.list_admins() to authenticated;
grant execute on function public.grant_admin(text) to authenticated;
grant execute on function public.revoke_admin(uuid) to authenticated;