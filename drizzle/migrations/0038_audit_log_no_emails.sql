CREATE OR REPLACE FUNCTION public.audit_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare rec_id text;
begin
  rec_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id');
  insert into public.audit_log(actor_id, actor_email, action, entity, entity_id, details)
  values (
    auth.uid(), null, lower(tg_op), tg_table_name, rec_id,
    case tg_op
      when 'INSERT' then jsonb_build_object('new', to_jsonb(new))
      when 'DELETE' then jsonb_build_object('old', to_jsonb(old))
      else jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
    end
  );
  return coalesce(new, old);
end $$;

CREATE OR REPLACE FUNCTION public.revoke_admin(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  if _user_id = auth.uid() then raise exception 'You cannot remove your own admin access.'; end if;
  if (select count(*) from public.user_roles where role='admin') <= 1 then raise exception 'At least one admin is required.'; end if;
  delete from public.user_roles where user_id=_user_id and role='admin';
  insert into public.audit_log(actor_id, actor_email, action, entity, entity_id, details)
  values (auth.uid(), null, 'delete', 'admin_roles', _user_id::text, '{}'::jsonb);
end $$;

CREATE OR REPLACE FUNCTION public.grant_admin(_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare uid uuid;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(_email)) limit 1;
  if uid is null then raise exception 'No account with that email. Ask them to sign up first.'; end if;
  if public.has_role(uid,'admin') then return 'already'; end if;
  insert into public.user_roles(user_id, role) values (uid,'admin');
  insert into public.audit_log(actor_id, actor_email, action, entity, entity_id, details)
  values (auth.uid(), null, 'insert', 'admin_roles', uid::text, '{}'::jsonb);
  return 'granted';
end $$;

CREATE OR REPLACE FUNCTION public.log_password_reset(_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare uid uuid;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(_email)) limit 1;
  if uid is null then raise exception 'No account with that email.'; end if;
  insert into public.audit_log(actor_id, actor_email, action, entity, entity_id, details)
  values (auth.uid(), null, 'reset', 'password_reset', uid::text, '{}'::jsonb);
  return 'ok';
end $$;

-- Remove email addresses already stored in the history.
UPDATE public.audit_log SET actor_email = NULL WHERE actor_email IS NOT NULL AND position('@' in actor_email) > 0;
UPDATE public.audit_log SET details = '{}'::jsonb WHERE entity IN ('admin_roles', 'password_reset');

ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_no_email
  CHECK (actor_email IS NULL OR position('@' in actor_email) = 0);