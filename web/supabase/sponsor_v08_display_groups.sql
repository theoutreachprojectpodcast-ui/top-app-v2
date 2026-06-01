-- tOP v0.8 — Sponsor public hub tiers + extended roster types (idempotent).
-- Adds sponsors_catalog.sponsor_display_group and normalizes sponsor_type for app roster rows.

begin;

alter table if exists public.sponsors_catalog
  add column if not exists sponsor_display_group text;

comment on column public.sponsors_catalog.sponsor_display_group is
  'Public sponsors hub section: mission_partner | foundational | impact | community (v0.8).';

-- Prereqs from v0.6 / v0.7 migrations (safe if already applied). Ingest may run v0.8 alone on a base catalog.
alter table if exists public.sponsors_catalog
  add column if not exists sponsor_scope text default 'app';
alter table if exists public.sponsors_catalog
  add column if not exists is_active boolean not null default true;
alter table if exists public.sponsors_catalog
  add column if not exists primary_display_tag text;
alter table if exists public.sponsors_catalog
  add column if not exists display_name text;
alter table if exists public.sponsors_catalog
  add column if not exists internal_alias text;
alter table if exists public.sponsors_catalog
  add column if not exists veteran_owned boolean not null default false;

-- Mission partners
insert into public.sponsors_catalog (
  slug, name, display_name, sponsor_type, sponsor_display_group, sponsor_scope, is_active, short_description, website_url, display_order, verified, enrichment_status
)
values (
  'apex-global-outdoors',
  'Apex Global Outdoors',
  'Apex Global Outdoors',
  'mission_partner_sponsor',
  'mission_partner',
  'app',
  true,
  'Outdoor gear and mission-aligned retail supporting veteran and first responder communities.',
  'https://apexglobaloutdoors.com/',
  1,
  true,
  'manual'
)
on conflict (slug) do update set
  sponsor_type = excluded.sponsor_type,
  sponsor_display_group = excluded.sponsor_display_group,
  sponsor_scope = excluded.sponsor_scope,
  is_active = excluded.is_active,
  short_description = excluded.short_description,
  website_url = coalesce(nullif(trim(public.sponsors_catalog.website_url), ''), excluded.website_url),
  display_name = excluded.display_name,
  updated_at = now();

-- Official Apex Global Outdoors logo + card hero (served from app `/public/sponsors/`).
update public.sponsors_catalog
set
  logo_url = '/sponsors/apex-global-outdoors-logo.png',
  background_image_url = '/sponsors/featured-bg-apex-global-outdoors.png',
  updated_at = now()
where slug = 'apex-global-outdoors';

update public.sponsors_catalog
set
  sponsor_type = 'mission_partner_sponsor',
  sponsor_display_group = 'mission_partner',
  primary_display_tag = 'Mission Partner Sponsor',
  sponsor_scope = 'app',
  is_active = true,
  updated_at = now()
where slug = 'gameday-mens-health';

-- Foundational
update public.sponsors_catalog
set
  sponsor_type = 'foundational_sponsor',
  sponsor_display_group = 'foundational',
  primary_display_tag = 'Foundational Sponsor',
  sponsor_scope = 'app',
  is_active = true,
  updated_at = now()
where slug = 'rope-solutions';

-- Impact tier
update public.sponsors_catalog
set
  sponsor_type = 'impact_sponsor',
  sponsor_display_group = 'impact',
  primary_display_tag = 'Impact Sponsor',
  sponsor_scope = 'app',
  is_active = true,
  updated_at = now()
where slug in ('rucking-realty-group', 'iron-soldiers-coffee-company');

insert into public.sponsors_catalog (
  slug, name, display_name, sponsor_type, sponsor_display_group, sponsor_scope, is_active, short_description, website_url, display_order, verified, enrichment_status, veteran_owned
)
values (
  'vetnav-services',
  'Vet Nav Services',
  'Vet Nav Services',
  'impact_sponsor',
  'impact',
  'app',
  true,
  'Navigation and resource coordination for veterans and families.',
  null,
  12,
  true,
  'manual',
  true
)
on conflict (slug) do update set
  sponsor_type = excluded.sponsor_type,
  sponsor_display_group = excluded.sponsor_display_group,
  sponsor_scope = excluded.sponsor_scope,
  is_active = excluded.is_active,
  short_description = excluded.short_description,
  veteran_owned = excluded.veteran_owned,
  updated_at = now();

-- Community tier
update public.sponsors_catalog
set
  sponsor_type = 'community_sponsor',
  sponsor_display_group = 'community',
  primary_display_tag = 'Community Sponsor',
  sponsor_scope = 'app',
  is_active = true,
  updated_at = now()
where slug in ('eduardo-pico-designs', 'wars-end-merch');

insert into public.sponsors_catalog (
  slug, name, display_name, sponsor_type, sponsor_display_group, sponsor_scope, is_active, short_description, website_url, display_order, verified, enrichment_status
)
values (
  'green-gorilla-land-management',
  'Green Gorilla Land Management',
  'Green Gorilla Land Management',
  'community_sponsor',
  'community',
  'app',
  true,
  'Land clearing, mulching, and site prep with disciplined field operations.',
  'https://gglandmanagement.com/',
  20,
  true,
  'manual'
)
on conflict (slug) do update set
  sponsor_type = excluded.sponsor_type,
  sponsor_display_group = excluded.sponsor_display_group,
  sponsor_scope = excluded.sponsor_scope,
  is_active = excluded.is_active,
  short_description = excluded.short_description,
  website_url = coalesce(nullif(trim(public.sponsors_catalog.website_url), ''), excluded.website_url),
  display_name = excluded.display_name,
  updated_at = now();

commit;
