CREATE OR REPLACE FUNCTION public.log_password_reset(_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare uid uuid;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(_email)) limit 1;
  if uid is null then raise exception 'No account with that email.'; end if;
  insert into public.audit_log(actor_id, actor_email, action, entity, entity_id, details)
  values (auth.uid(), (select email from auth.users where id=auth.uid()), 'reset', 'password_reset', uid::text, jsonb_build_object('new', jsonb_build_object('name', lower(trim(_email)))));
  return 'ok';
end $$;
REVOKE ALL ON FUNCTION public.log_password_reset(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_password_reset(text) TO authenticated;