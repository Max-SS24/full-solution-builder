ALTER TABLE public.care_options ADD COLUMN IF NOT EXISTS geo_estimated boolean NOT NULL DEFAULT false;

CREATE TABLE public.user_security (
  user_id uuid PRIMARY KEY,
  email_mfa boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_security TO authenticated;
GRANT ALL ON public.user_security TO service_role;
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own security read" ON public.user_security FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.mfa_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mfa_proofs TO service_role;
ALTER TABLE public.mfa_proofs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mfa_sessions (
  session_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  cleared_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mfa_sessions TO service_role;
ALTER TABLE public.mfa_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_mfa_cleared()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select not exists (select 1 from public.user_security where user_id = auth.uid() and email_mfa)
      or exists (select 1 from public.mfa_sessions where user_id = auth.uid()
                 and session_id::text = coalesce(auth.jwt() ->> 'session_id', ''))
$$;
GRANT EXECUTE ON FUNCTION public.has_mfa_cleared() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
     and (_user_id is distinct from auth.uid() or public.has_mfa_cleared())
$$;

CREATE OR REPLACE FUNCTION public.init_user_security()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into public.user_security(user_id, email_mfa)
  values (new.id, coalesce((new.raw_user_meta_data ->> 'email_mfa')::boolean, false))
  on conflict (user_id) do nothing;
  return new;
exception when others then return new;
end $$;
CREATE TRIGGER on_auth_user_security AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.init_user_security();

ALTER POLICY "own history delete" ON public.search_history USING (user_id = auth.uid() and public.has_mfa_cleared());
ALTER POLICY "own history insert" ON public.search_history WITH CHECK (user_id = auth.uid() and public.has_mfa_cleared());
ALTER POLICY "own history select" ON public.search_history USING (user_id = auth.uid() and public.has_mfa_cleared());
ALTER POLICY "own prefs delete" ON public.user_preferences USING (user_id = auth.uid() and public.has_mfa_cleared());
ALTER POLICY "own prefs insert" ON public.user_preferences WITH CHECK (user_id = auth.uid() and public.has_mfa_cleared());
ALTER POLICY "own prefs select" ON public.user_preferences USING (user_id = auth.uid() and public.has_mfa_cleared());
ALTER POLICY "own prefs update" ON public.user_preferences USING (user_id = auth.uid() and public.has_mfa_cleared());