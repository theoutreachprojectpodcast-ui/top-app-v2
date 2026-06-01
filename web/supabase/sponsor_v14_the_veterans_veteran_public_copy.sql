-- tOP v1.4 — The Veterans Veteran: VA benefits consulting (thevetsvet.com). Not War's End.
-- Superseded for fresh DBs by sponsor_v16_veterans_veteran_separate_from_wars_end.sql when both are run.

begin;

update public.sponsors_catalog
set
  name = 'The Veterans Veteran',
  display_name = 'The Veterans Veteran',
  sponsor_category = 'Veteran benefits consulting',
  short_description = 'VA disability claims & post-service coaching',
  tagline =
    'Veteran-led guidance through VA disability claims, ratings, appeals, and GI Bill planning—so you do not navigate the system alone.',
  long_description =
    $tvv$
The Veterans Veteran, founded and led by Drew Jones, helps veterans move through the VA disability and benefits process with clarity and advocacy. The team provides educational and administrative support—not legal representation—including claims and ratings review, medical evidence organization, appeals guidance, and GI Bill maximization. Post-service coaching helps veterans set career goals and build a roadmap after the uniform.
$tvv$,
  website_url = coalesce(nullif(trim(website_url), ''), 'https://thevetsvet.com/'),
  instagram_url = null,
  social_links = '{}'::jsonb,
  updated_at = now()
where slug = 'the-veterans-veteran';

commit;
