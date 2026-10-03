CREATE TABLE public.care_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.care_resources(id) ON DELETE CASCADE,
  name text NOT NULL,
  credentials text,
  insurance text[] NOT NULL DEFAULT '{}',
  bio text,
  source_url text NOT NULL,
  is_sample boolean NOT NULL DEFAULT true,
  last_checked date NOT NULL DEFAULT CURRENT_DATE
);
GRANT SELECT ON public.care_providers TO anon, authenticated;
GRANT ALL ON public.care_providers TO service_role;
ALTER TABLE public.care_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read providers of enabled sources" ON public.care_providers FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.care_resources r JOIN public.data_sources s ON s.id = r.source_id WHERE r.id = care_providers.resource_id AND s.enabled));
INSERT INTO public.care_providers (resource_id, name, credentials, insurance, bio, source_url)
SELECT r.id, p.name, p.cred, p.ins, p.bio, r.source_url
FROM public.care_resources r
JOIN (VALUES
 ('Peachtree Recovery & Behavioral Health','Dana Whitfield','LCSW', ARRAY['tricare','medicaid','private'], 'SAMPLE PROFILE. Army spouse and trauma-focused therapist using CPT and EMDR with veterans and families.'),
 ('Peachtree Recovery & Behavioral Health','Marcus Hale','PsyD', ARRAY['tricare','medicare','private'], 'SAMPLE PROFILE. Marine Corps veteran; specializes in PTSD, moral injury and anger management.'),
 ('Peachtree Recovery & Behavioral Health','Renee Ortiz','LPC, CAADC', ARRAY['medicaid','medicare','self-pay'], 'SAMPLE PROFILE. Substance use and co-occurring depression; runs a weekly veterans peer group.'),
 ('North Star Telehealth — Vet Care Team','Jordan Kim','LMFT', ARRAY['private','self-pay'], 'SAMPLE PROFILE. Telehealth couples and individual therapy for transitioning service members.'),
 ('North Star Telehealth — Vet Care Team','Alicia Grant','LPCC', ARRAY['private','sliding scale'], 'SAMPLE PROFILE. Anxiety, grief and sleep problems; evening video sessions.'),
 ('Buckeye Behavioral Health','Samuel Price','LISW-S', ARRAY['medicaid','medicare','private'], 'SAMPLE PROFILE. Depression and grief counseling; Navy veteran.'),
 ('Tidewater Behavioral Health (CCN)','Keisha Monroe','PhD', ARRAY['va','tricare'], 'SAMPLE PROFILE. VA Community Care provider focused on MST and trauma recovery.'),
 ('Tidewater Behavioral Health (CCN)','Brian Ellis','LCSW', ARRAY['tricare'], 'SAMPLE PROFILE. Prolonged exposure therapy for combat PTSD.')
) AS p(res, name, cred, ins, bio) ON p.res = r.name;