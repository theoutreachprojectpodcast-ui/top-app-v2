-- Sponsor curated public copy — editorial overrides in sponsor_enrichment.
-- Curated fields win over sponsors_catalog and scraped enrichment at read time.
-- Idempotent. Run after safe_alignment_extension_2026_04.sql (sponsor_enrichment exists).

begin;

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

comment on column public.sponsor_enrichment.curated_tagline is
  'Editorial tagline; overrides sponsors_catalog.tagline when non-null.';
comment on column public.sponsor_enrichment.curated_short_description is
  'Editorial short line; overrides sponsors_catalog.short_description when non-null.';
comment on column public.sponsor_enrichment.curated_long_description is
  'Editorial overview body; overrides sponsors_catalog.long_description when non-null.';
comment on column public.sponsor_enrichment.curated_source is
  'Provenance: admin | migration | repo-sync | seed';

-- Apex Global Outdoors — mission overview (also mirrored on sponsors_catalog for direct reads).
update public.sponsors_catalog
set
  short_description = 'Outdoor gear & expedition retail',
  tagline =
    'Curated gear and global outdoor brands for people who train, travel, and serve in demanding environments.',
  long_description =
    $apex$
Our mission is simple: To deliver expertly planned trips, exceptional accommodations, harvests lead by the world's leading outfitters, and vacations that will become core memories for you and your family.
$apex$,
  enrichment_status = 'curated',
  updated_at = now()
where slug = 'apex-global-outdoors';

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
  'migration:sponsor_v20',
  'curated',
  now()
from public.sponsors_catalog sc
where sc.slug = 'apex-global-outdoors'
on conflict (sponsor_id) do update set
  curated_tagline = excluded.curated_tagline,
  curated_short_description = excluded.curated_short_description,
  curated_long_description = excluded.curated_long_description,
  curated_at = excluded.curated_at,
  curated_source = excluded.curated_source,
  enrichment_status = case
    when nullif(trim(excluded.curated_long_description), '') is not null then 'curated'
    else public.sponsor_enrichment.enrichment_status
  end,
  updated_at = now();

commit;
