insert into public.care_resources (name, kind, city, state, formats, needs, care_types, payment, veteran_focus, phone, source_url, verified, source_id)
select v.name, v.kind, 'Atlanta', 'GA', v.formats, v.needs, v.care_types, v.payment, v.vf, v.phone, v.url, true, s.id
from (values
 ('Atlanta VA Medical Center — Mental Health','VA facility',array['in-person','telehealth'],array['ptsd','depression','anxiety','substance use'],array['therapy','psychiatry','iop'],array['va'],true,'404-321-6111','https://www.va.gov/atlanta-health-care/','VA Facilities API'),
 ('Atlanta Vet Center','Vet Center',array['in-person','phone','telehealth'],array['ptsd','mst','grief','trauma'],array['counseling','group'],array['va'],true,'404-417-5414','https://www.va.gov/atlanta-vet-center/','VA Facilities API'),
 ('Peachtree Recovery & Behavioral Health','Treatment center',array['in-person','telehealth'],array['substance use','depression','anxiety'],array['iop','therapy','group'],array['tricare','medicaid','medicare','private'],true,null,'https://findtreatment.gov/','FindTreatment.gov (SAMHSA)')
) as v(name,kind,formats,needs,care_types,payment,vf,phone,url,src)
join public.data_sources s on s.name = v.src;