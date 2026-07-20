-- Gameday mission partner classification + Apex verified social links.
-- Idempotent. Run when catalog still lists Gameday as podcast sponsor or Apex socials are missing.

begin;

alter table if exists public.sponsors_catalog
  add column if not exists social_links jsonb;

update public.sponsors_catalog
set
  name = 'Gameday Men''s Health',
  sponsor_scope = 'app',
  sponsor_type = 'mission_partner_sponsor',
  sponsor_display_group = 'mission_partner',
  primary_display_tag = 'Mission Partner Sponsor',
  sponsor_category = 'Men''s & Women''s Wellness',
  short_description = 'Men''s & Women''s Wellness',
  tagline =
    'San Antonio — same-day visits, on-site labs, and physician-guided men''s & Women''s health care in a private clinic.',
  long_description =
    $gd$
Patients get same-day scheduling, on-site labs with rapid turnaround, and physician-guided treatment plans across testosterone therapy, weight management, sexual wellness, hair restoration, and recovery support.
$gd$,
  mission_partner = true,
  featured = true,
  enrichment_status = 'curated',
  updated_at = now()
where slug in ('gameday-mens-health', 'game-day-mens-health');

update public.sponsors_catalog
set
  sponsor_scope = 'app',
  sponsor_type = 'mission_partner_sponsor',
  sponsor_display_group = 'mission_partner',
  primary_display_tag = 'Mission Partner Sponsor',
  mission_partner = true,
  featured = true,
  instagram_url = 'https://www.instagram.com/apex_global_outdoors/',
  facebook_url = 'https://www.facebook.com/apexglobaloutdoors',
  youtube_url = 'https://www.youtube.com/channel/UCW6eRLm7RTo8_iqcem6AweA',
  social_links = jsonb_strip_nulls(
    jsonb_build_object(
      'instagram', 'https://www.instagram.com/apex_global_outdoors/',
      'facebook', 'https://www.facebook.com/apexglobaloutdoors',
      'youtube', 'https://www.youtube.com/channel/UCW6eRLm7RTo8_iqcem6AweA'
    )
  ),
  updated_at = now()
where slug = 'apex-global-outdoors';

commit;
