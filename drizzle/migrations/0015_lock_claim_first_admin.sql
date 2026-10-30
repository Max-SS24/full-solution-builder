create or replace function public.claim_first_admin() returns boolean language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then return false; end if;
  return public.has_role(auth.uid(),'admin');
end $$;