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
  short_description = 'VA disability claims & post-service coaching',
  tagline =
    'Veteran-led guidance through VA disability claims, ratings, appeals, and GI Bill planning.',
  updated_at = now()
where slug = 'the-veterans-veteran';

commit;
