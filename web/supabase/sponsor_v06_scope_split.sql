-- v0.6 sponsor scope split:
-- - Main Sponsors page: foundational sponsors only
-- - Podcast page: podcast_sponsor records only
--
-- Safe/idempotent update script for existing catalog rows.

begin;

alter table if exists public.sponsors_catalog
  add column if not exists sponsor_scope text default 'app';

alter table if exists public.sponsors_catalog
  add column if not exists is_active boolean not null default true;

alter table if exists public.sponsors_catalog
  add column if not exists display_order integer not null default 0;

-- Foundational sponsors shown on /sponsors
update public.sponsors_catalog
set
  sponsor_scope = 'app',
  sponsor_type = 'foundational_sponsor',
  is_active = true
where slug in (
  'rope-solutions',
  'gameday-mens-health',
  'wars-end-merch',
  'the-veterans-veteran'
);

-- Keep all known podcast sponsors in podcast scope.
update public.sponsors_catalog
set sponsor_scope = 'podcast'
where slug in (
  'rucking-realty-group',
  'iron-soldiers-coffee-company',
  'eduardo-pico-designs',
  'brain-treatment-center'
);

commit;
