DELETE FROM public.care_providers WHERE resource_id IN (SELECT id FROM public.care_resources WHERE NOT verified AND phone LIKE '%555-01%');
DELETE FROM public.care_resources WHERE NOT verified AND phone LIKE '%555-01%';
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;