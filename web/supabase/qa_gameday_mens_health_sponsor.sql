-- Gameday Men's Health — foundational app sponsor. Idempotent upsert for QA/prod.

insert into public.sponsors_catalog (
  slug,
  name,
  sponsor_type,
  sponsor_category,
  sponsor_scope,
  website_url,
  logo_url,
  background_image_url,
  short_description,
  long_description,
  tagline,
  featured,
  mission_partner,
  is_active,
  sponsor_status,
  display_order,
  warm_variant,
  verified,
  enrichment_status,
  updated_at
)
values (
  'gameday-mens-health',
  'Gameday Men''s Health',
  'foundational_sponsor',
  'Men''s health',
  'app',
  'https://gamedaymenshealth.com/',
  '/sponsors/gameday-mens-health-logo-transparent.png',
  '/sponsors/featured-bg-gameday-mens-health.png',
  'Men''s health clinics',
  $gd$
Gameday Men's Health is a national network of men's health clinics built for fast, decisive care: same-day appointments, on-site lab testing with results in as little as 15 minutes, and physician-guided treatment plans. Services span testosterone therapy, GLP-1 weight management, peptides and vitamins, sexual wellness and ED, hair loss, anti-aging, and sports-injury recovery — delivered in private, sports-lounge-style clinics.

Trusted by men across the U.S. and Canada, Gameday pairs personalized protocols with a growing network of dedicated clinicians so patients get clear answers and a path forward without guesswork.
$gd$,
  'Testosterone therapy, weight loss, sexual wellness, and vitality — 400+ clinics across the U.S. and Canada.',
  true,
  true,
  true,
  'active',
  6,
  'rust',
  true,
  'seed',
  now()
)
on conflict (slug) do update
set
  name = excluded.name,
  sponsor_type = excluded.sponsor_type,
  sponsor_category = excluded.sponsor_category,
  sponsor_scope = excluded.sponsor_scope,
  website_url = excluded.website_url,
  logo_url = excluded.logo_url,
  background_image_url = excluded.background_image_url,
  short_description = excluded.short_description,
  long_description = excluded.long_description,
  tagline = excluded.tagline,
  featured = excluded.featured,
  mission_partner = excluded.mission_partner,
  is_active = excluded.is_active,
  sponsor_status = excluded.sponsor_status,
  display_order = excluded.display_order,
  warm_variant = excluded.warm_variant,
  verified = excluded.verified,
  enrichment_status = excluded.enrichment_status,
  updated_at = now();
