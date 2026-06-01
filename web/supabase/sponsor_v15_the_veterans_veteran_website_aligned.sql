-- DEPRECATED — superseded by sponsor_v16_veterans_veteran_separate_from_wars_end.sql (TVV ≠ War's End).
-- tOP v1.5 — The Veterans Veteran: align public copy with Wars End LLC (warsendmerch.com).
-- Public brand: The Veterans Veteran. Shop: Wars End LLC — handmade flags & custom woodworking;
-- portion of purchases support veteran nonprofits (Freedom Alliance, War Heroes On Water, etc.).
-- Idempotent UPDATE by slug. Deactivates legacy wars-end-merch duplicate row on the app hub.

begin;

update public.sponsors_catalog
set
  is_active = true,
  sponsor_scope = 'app',
  sponsor_type = 'foundational_sponsor',
  sponsor_display_group = 'foundational',
  primary_display_tag = 'Foundational Sponsor',
  name = 'The Veterans Veteran',
  display_name = 'The Veterans Veteran',
  internal_alias =
    $ia$
Public brand: The Veterans Veteran. Operated by Wars End LLC (warsendmerch.com). Instagram: @wars__end (Joshua Melching). Legacy catalog slug: wars-end-merch.
$ia$,
  sponsor_category = 'Custom woodworking & flags',
  short_description = 'Handmade American flags & custom woodworking',
  tagline =
    'Veteran-owned Texas shop—hand-built flags and woodwork with a portion of every purchase supporting veteran nonprofit partners.',
  long_description =
    $tvv$
The Veterans Veteran is the public-facing brand of Wars End LLC, a veteran-owned custom woodworking business founded after twenty years of military service. The shop hand-builds American flags and custom wood pieces to honor service, recovery, and resilience. Each purchase dedicates a portion of proceeds to veteran nonprofit organizations—the team donates flags and partners with groups such as Freedom Alliance, War Heroes On Water, Frontline Heroes Outdoors, and mission-aligned allies across Texas and beyond.
$tvv$,
  website_url = 'https://www.warsendmerch.com/',
  instagram_url = 'https://www.instagram.com/wars__end/',
  social_links = jsonb_strip_nulls(
    jsonb_build_object('instagram', 'https://www.instagram.com/wars__end/')
  ),
  background_image_url = coalesce(
    nullif(trim(background_image_url), ''),
    '/sponsors/featured-bg-wars-end-merch.png'
  ),
  logo_url = coalesce(nullif(trim(logo_url), ''), '/sponsors/the-veterans-veteran-logo.png'),
  veteran_owned = true,
  updated_at = now()
where slug = 'the-veterans-veteran';

-- Legacy duplicate slug: keep podcast/history references resolvable but off the public app roster.
update public.sponsors_catalog
set
  is_active = false,
  sponsor_scope = coalesce(nullif(trim(sponsor_scope), ''), 'app'),
  admin_notes = coalesce(
    nullif(trim(admin_notes), ''),
  'Deactivated v1.5: use the-veterans-veteran for public hub (Wars End LLC / warsendmerch.com).'
  ),
  updated_at = now()
where slug = 'wars-end-merch';

commit;
