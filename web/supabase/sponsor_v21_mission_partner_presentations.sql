-- Mission partner + foundational sponsor presentation copy (Apex, Gameday, Rope Solutions).
-- Idempotent. Run after sponsor_v20_curated_copy_enrichment.sql (or standalone — adds missing columns).

begin;

alter table if exists public.sponsors_catalog
  add column if not exists sponsor_category text;

alter table if exists public.sponsor_enrichment
  add column if not exists curated_tagline text;

alter table if exists public.sponsor_enrichment
  add column if not exists curated_short_description text;

alter table if exists public.sponsor_enrichment
  add column if not exists curated_long_description text;

alter table if exists public.sponsor_enrichment
  add column if not exists curated_at timestamptz;

alter table if exists public.sponsor_enrichment
  add column if not exists curated_source text;

-- Apex Global Outdoors (Global Hunting Agent)
update public.sponsors_catalog
set
  sponsor_category = 'Global Hunting Agent',
  short_description = 'Global Hunting Agent',
  tagline =
    'Apex Global Outdoors is a retired LEO-owned hunting & fishing booking agency offering only personally vetted locations to ensure world-class outdoor adventures.',
  long_description =
    $apex$
Our mission is simple: To deliver expertly planned trips, exceptional accommodations, harvests led by the world's leading outfitters, and vacations that will become core memories for you and your family.
$apex$,
  enrichment_status = 'curated',
  updated_at = now()
where slug = 'apex-global-outdoors';

-- Gameday Men's Health (Men's & Women's Wellness)
update public.sponsors_catalog
set
  sponsor_category = 'Men''s & Women''s Wellness',
  short_description = 'Men''s & Women''s Wellness',
  tagline =
    'San Antonio — same-day visits, on-site labs, and physician-guided men''s & women''s health care in a private clinic.',
  long_description =
    $gd$
Patients get same-day scheduling, on-site labs with rapid turnaround, and physician-guided treatment plans across testosterone therapy, weight management, sexual wellness, hair restoration, and recovery support.
$gd$,
  enrichment_status = 'curated',
  updated_at = now()
where slug in ('gameday-mens-health', 'game-day-mens-health');

-- Rope Solutions (Elite Leadership Coaching)
update public.sponsors_catalog
set
  sponsor_category = 'Elite Leadership Coaching',
  short_description = 'Elite Leadership Coaching',
  tagline = 'Leadership Development where it matters most: on the front lines of your operation.',
  long_description =
    $rope$
ROPE Solutions embeds with your organization to build elite leaders, high-performing teams, and strategies that hold up when the pressure is real, closing the gap between leadership training and leadership that actually performs.
$rope$,
  enrichment_status = 'curated',
  updated_at = now()
where slug = 'rope-solutions';

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
  'migration:sponsor_v21',
  'curated',
  now()
from public.sponsors_catalog sc
where sc.slug in ('apex-global-outdoors', 'gameday-mens-health', 'game-day-mens-health', 'rope-solutions')
on conflict (sponsor_id) do update set
  curated_tagline = excluded.curated_tagline,
  curated_short_description = excluded.curated_short_description,
  curated_long_description = excluded.curated_long_description,
  curated_at = excluded.curated_at,
  curated_source = excluded.curated_source,
  enrichment_status = 'curated',
  updated_at = now();

commit;
