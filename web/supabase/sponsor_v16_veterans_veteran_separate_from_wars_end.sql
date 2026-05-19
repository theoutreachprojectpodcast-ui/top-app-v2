-- tOP v1.6 — The Veterans Veteran (VA benefits / thevetsvet.com) and War's End (woodworking / warsendmerch.com)
-- are separate sponsors. Reverses v1.5 merge that conflated them.

begin;

-- The Veterans Veteran — veteran benefits consulting (Drew Jones; NOT Wars End LLC).
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
    'VA disability claims, ratings, appeals guidance, GI Bill maximization, and post-service coaching. thevetsvet.com. Separate from War''s End (wars-end-merch).',
  short_description = 'VA disability claims & post-service coaching',
  tagline =
    'Veteran-led guidance through VA disability claims, ratings, appeals, and GI Bill planning—so you do not navigate the system alone.',
  long_description =
    $tvv$
The Veterans Veteran, founded and led by Drew Jones, helps veterans move through the VA disability and benefits process with clarity and advocacy. The team provides educational and administrative support—not legal representation—including claims and ratings review, medical evidence organization, appeals guidance, and GI Bill maximization. Post-service coaching helps veterans set career goals and build a roadmap after the uniform. Fellow service members built this practice after walking the same transition; the mission is to ensure veterans understand their options and receive the benefits they earned.
$tvv$,
  website_url = 'https://thevetsvet.com/',
  instagram_url = null,
  facebook_url = null,
  linkedin_url = null,
  logo_url = coalesce(nullif(trim(logo_url), ''), '/sponsors/the-veterans-veteran-logo.png'),
  background_image_url = coalesce(
    nullif(trim(background_image_url), ''),
    '/sponsors/featured-bg-the-veterans-veteran.png'
  ),
  veteran_owned = true,
  social_links = '{}'::jsonb,
  admin_notes = 'v1.6: VA benefits brand (thevetsvet.com). Not Wars End / warsendmerch.com.',
  updated_at = now()
where slug = 'the-veterans-veteran';

-- War's End — veteran-owned woodworking & flags (Joshua Melching; warsendmerch.com).
update public.sponsors_catalog
set
  is_active = true,
  sponsor_scope = 'app',
  sponsor_type = 'foundational_sponsor',
  sponsor_display_group = 'foundational',
  primary_display_tag = 'Foundational Sponsor',
  name = $we$War's End$we$,
  display_name = $we$War's End$we$,
  internal_alias =
    'Veteran-owned handmade American flags and custom woodworking. warsendmerch.com / @wars__end. Separate from The Veterans Veteran (the-veterans-veteran / thevetsvet.com).',
  short_description = 'Handmade American flags & custom woodworking',
  tagline =
    'Handmade American flags and woodworking from a veteran-owned Texas shop—honoring service through craft.',
  long_description =
    $wed$
War's End is a veteran-owned custom woodworking business led by Joshua Melching after twenty years of military service. The shop hand-builds American flags and one-of-a-kind wood pieces with discipline and intention. A portion of proceeds supports veteran nonprofit partners, and the team donates flags to mission-aligned organizations including Freedom Alliance, War Heroes On Water, and Frontline Heroes Outdoors across Texas and beyond.
$wed$,
  website_url = 'https://www.warsendmerch.com/',
  instagram_url = 'https://www.instagram.com/wars__end/',
  background_image_url = coalesce(
    nullif(trim(background_image_url), ''),
    '/sponsors/featured-bg-wars-end-merch.png'
  ),
  veteran_owned = true,
  social_links = jsonb_strip_nulls(jsonb_build_object('instagram', 'https://www.instagram.com/wars__end/')),
  admin_notes = 'v1.6: Woodworking / flags shop. Not The Veterans Veteran (VA claims).',
  updated_at = now()
where slug = 'wars-end-merch';

commit;
