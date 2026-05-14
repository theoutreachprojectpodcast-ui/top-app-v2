-- tOP v1.4 — The Veterans Veteran: catalog copy describes the org directly (TVV-first; no War's End sub-brand framing).
-- Idempotent UPDATE by slug. Apply on DBs that already ran sponsor_v10_hub_public_copy.sql.

begin;

update public.sponsors_catalog
set
  name = 'The Veterans Veteran',
  display_name = 'The Veterans Veteran',
  sponsor_category = 'Veteran nonprofit & craft',
  short_description = 'Handmade American flags & custom woodworking',
  tagline =
    'Veteran-owned flags and custom woodworking from Texas—each piece honors service and recovery while proceeds support veteran-serving nonprofits.',
  long_description =
    $tvv$
The Veterans Veteran is a veteran-owned organization in Texas that hand-builds American flags and custom woodworking with patience, precision, and respect for the uniform. Work is crafted to honor service, recovery, and resilience. Proceeds and collaborations fund veteran-focused nonprofits so craftsmanship in the shop translates into concrete help for people navigating transition, health care, employment, and community reintegration.
$tvv$,
  website_url = coalesce(nullif(trim(website_url), ''), 'https://www.warsendmerch.com/'),
  instagram_url = coalesce(nullif(trim(instagram_url), ''), 'https://www.instagram.com/wars__end/'),
  social_links = coalesce(
    social_links,
    '{}'::jsonb
  ) || jsonb_strip_nulls(jsonb_build_object('instagram', 'https://www.instagram.com/wars__end/')),
  updated_at = now()
where slug = 'the-veterans-veteran';

commit;
