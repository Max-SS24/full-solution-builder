create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.claim_first_admin() returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists(select 1 from public.user_roles where role='admin') then return public.has_role(auth.uid(),'admin'); end if;
  insert into public.user_roles(user_id, role) values (auth.uid(),'admin');
  return true;
end $$;
grant execute on function public.claim_first_admin() to authenticated;

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  category text not null default 'community',
  description text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.data_sources to anon, authenticated;
grant insert, update, delete on public.data_sources to authenticated;
grant all on public.data_sources to service_role;
alter table public.data_sources enable row level security;
create policy "public read enabled" on public.data_sources for select to anon, authenticated using (enabled or public.has_role(auth.uid(),'admin'));
create policy "admin insert" on public.data_sources for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update" on public.data_sources for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete" on public.data_sources for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.care_resources (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete cascade,
  name text not null,
  kind text not null,
  city text, state text,
  formats text[] not null default '{}',
  needs text[] not null default '{}',
  care_types text[] not null default '{}',
  payment text[] not null default '{}',
  veteran_focus boolean not null default false,
  phone text,
  source_url text not null,
  verified boolean not null default false,
  last_checked date not null default current_date
);
grant select on public.care_resources to anon, authenticated;
grant all on public.care_resources to service_role;
alter table public.care_resources enable row level security;
create policy "read resources of enabled sources" on public.care_resources for select to anon, authenticated using (exists(select 1 from public.data_sources s where s.id=source_id and s.enabled));

with s as (
  insert into public.data_sources(name,url,category,description) values
  ('VA Facilities API','https://developer.va.gov/explore/api/va-facilities/docs','va','VA facilities, services, hours and contacts'),
  ('FindTreatment.gov (SAMHSA)','https://findtreatment.gov','community','Behavioral-health and substance-use treatment facilities'),
  ('Psychology Today Veterans Directory','https://www.psychologytoday.com/us/therapists?category=veterans','community','Community therapist discovery'),
  ('VA Community Care Network','https://www.va.gov/resources/about-our-va-community-care-network-and-covered-services/','va','Community care pathways and authorization context')
  returning id, name)
insert into public.care_resources(source_id,name,kind,city,state,formats,needs,care_types,payment,veteran_focus,phone,source_url,verified)
select s.id, r.name, r.kind, r.city, r.state, r.formats, r.needs, r.care_types, r.payment, r.vf, r.phone, r.url, r.verified
from s join (values
 ('VA Facilities API','Columbus VA Clinic — Mental Health','VA facility','Columbus','OH',array['in-person','telehealth'],array['ptsd','depression','anxiety'],array['therapy','psychiatry'],array['va'],true,'(614) 555-0100','https://www.va.gov/find-locations',true),
 ('VA Facilities API','Columbus Vet Center','Vet Center','Columbus','OH',array['in-person','phone'],array['ptsd','mst','grief'],array['counseling','group'],array['va'],true,'(614) 555-0130','https://www.vetcenter.va.gov',true),
 ('FindTreatment.gov (SAMHSA)','Buckeye Behavioral Health','Treatment center','Columbus','OH',array['in-person','telehealth'],array['substance use','ptsd','depression'],array['iop','therapy'],array['medicaid','medicare','private'],false,'(614) 555-0177','https://findtreatment.gov',true),
 ('Psychology Today Veterans Directory','North Star Telehealth — Vet Care Team','Community provider','Columbus','OH',array['telehealth'],array['ptsd','anxiety','trauma'],array['therapy'],array['private','self-pay','sliding scale'],true,'(614) 555-0192','https://www.psychologytoday.com',false),
 ('VA Community Care Network','Tidewater Behavioral Health (CCN)','Community provider','Norfolk','VA',array['in-person','telehealth'],array['ptsd','depression'],array['therapy','counseling'],array['va','tricare'],true,'(757) 555-0110','https://www.va.gov/communitycare',false),
 ('VA Facilities API','Hampton VAMC — PTSD Clinic','VA facility','Hampton','VA',array['in-person'],array['ptsd','mst'],array['therapy','psychiatry','residential'],array['va'],true,'(757) 555-0140','https://www.va.gov/find-locations',true)
) as r(src,name,kind,city,state,formats,needs,care_types,payment,vf,phone,url,verified) on r.src=s.name;