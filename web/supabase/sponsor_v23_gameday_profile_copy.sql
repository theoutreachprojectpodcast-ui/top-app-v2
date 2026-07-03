-- Gameday Men's Health — mission partner profile copy (app hub + detail page).
-- Idempotent. Run on production/QA when catalog still has legacy podcast-sponsor text.

begin;

update public.sponsors_catalog
set
  name = 'Gameday Men''s Health',
  sponsor_scope = 'app',
  sponsor_category = 'Men''s & Women''s Wellness',
  sponsor_type = 'mission_partner_sponsor',
  short_description = 'Men''s & Women''s Wellness',
  tagline =
    'San Antonio — same-day visits, on-site labs, and physician-guided men''s & Women''s health care in a private clinic.',
  long_description =
    $gd$
Patients get same-day scheduling, on-site labs with rapid turnaround, and physician-guided treatment plans across testosterone therapy, weight management, sexual wellness, hair restoration, and recovery support.
$gd$,
  enrichment_status = 'curated',
  mission_partner = true,
  featured = true,
  updated_at = now()
where slug in ('gameday-mens-health', 'game-day-mens-health');

insert into public.sponsor_enrichment (
  sponsor_id,
  canonical_display_name,
  curated_tagline,
  curated_short_description,
  curated_long_description,
  curated_at,
  curated_source,
  enrichment_status,
  updated_at
)
select
  sc.id,
  sc.name,
  sc.tagline,
  sc.short_description,
  sc.long_description,
  now(),
  'migration:sponsor_v23_gameday_profile_copy',
  'curated',
  now()
from public.sponsors_catalog sc
where sc.slug in ('gameday-mens-health', 'game-day-mens-health')
on conflict (sponsor_id) do update set
  canonical_display_name = excluded.canonical_display_name,
  curated_tagline = excluded.curated_tagline,
  curated_short_description = excluded.curated_short_description,
  curated_long_description = excluded.curated_long_description,
  curated_at = excluded.curated_at,
  curated_source = excluded.curated_source,
  enrichment_status = 'curated',
  updated_at = now();

commit;
