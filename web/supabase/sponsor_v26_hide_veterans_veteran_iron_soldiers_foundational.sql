-- Hide The Veterans Veteran from public surfaces; Iron Soldiers → foundational (app hub).
-- Idempotent.

begin;

alter table if exists public.sponsors_catalog
  add column if not exists admin_notes text;

update public.sponsors_catalog
set
  is_active = false,
  sponsor_scope = 'app',
  admin_notes = coalesce(
    nullif(trim(admin_notes), ''),
    'Hidden from public sponsor hub and profile (v26).'
  ),
  updated_at = now()
where slug = 'the-veterans-veteran';

update public.sponsors_catalog
set
  sponsor_scope = 'app',
  sponsor_type = 'foundational_sponsor',
  sponsor_display_group = 'foundational',
  primary_display_tag = 'Foundational Sponsor',
  is_active = true,
  updated_at = now()
where slug = 'iron-soldiers-coffee-company';

commit;
