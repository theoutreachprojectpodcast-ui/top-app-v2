-- Align Supabase roster with public /sponsors tier chart (nine app sponsors).
-- Safe/idempotent: targeted UPDATEs by slug. Run after sponsors_catalog + sponsor_display_group exist.

begin;

-- The Veterans Veteran — foundational partner on the app hub.
update public.sponsors_catalog
set
  is_active = true,
  sponsor_scope = 'app',
  sponsor_type = 'foundational_sponsor',
  sponsor_display_group = 'foundational',
  primary_display_tag = 'Foundational Sponsor',
  name = 'The Veterans Veteran',
  short_description = 'Handmade American flags & custom woodworking',
  tagline =
    'Veteran-owned flags and custom woodworking from Texas—each piece honors service and recovery while proceeds support veteran-serving nonprofits.',
  updated_at = now()
where slug = 'the-veterans-veteran';

commit;
