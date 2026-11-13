CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select case
    when _user_id is null then false
    when _user_id = auth.uid() then
      exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
      and public.has_mfa_cleared()
    when exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin')
         and public.has_mfa_cleared() then
      exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
    when auth.uid() is null and coalesce(auth.role(),'') = 'service_role' then
      exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
    else false
  end
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;