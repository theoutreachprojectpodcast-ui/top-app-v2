-- Apex Global Outdoors: refresh Overview (long_description) on sponsor detail page.
-- Idempotent UPDATE by slug.

begin;

update public.sponsors_catalog
set
  long_description =
    $apex$
Our mission is simple: To deliver expertly planned trips, exceptional accommodations, harvests lead by the world's leading outfitters, and vacations that will become core memories for you and your family.
$apex$,
  updated_at = now()
where slug = 'apex-global-outdoors';

commit;
