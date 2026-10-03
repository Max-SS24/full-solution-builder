ALTER TABLE public.data_sources ADD COLUMN IF NOT EXISTS connector text;
UPDATE public.data_sources SET connector = 'findtreatment' WHERE name = 'FindTreatment.gov (SAMHSA)';
INSERT INTO public.data_sources (name, url, category, description, enabled, connector)
SELECT 'NPI Registry (CMS)', 'https://npiregistry.cms.hhs.gov', 'licensing', 'Official federal registry of licensed clinicians: names, credentials, specialties, addresses and phone numbers. Live lookup.', true, 'npi'
WHERE NOT EXISTS (SELECT 1 FROM public.data_sources WHERE connector = 'npi');