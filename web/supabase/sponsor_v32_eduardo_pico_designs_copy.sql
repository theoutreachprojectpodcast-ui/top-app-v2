-- Eduardo Pico Designs — sponsor card + profile copy refresh.
begin;

update public.sponsors_catalog
set
  sponsor_category = 'Woodworking & custom fabrication',
  short_description = 'Woodworking & custom fabrication',
  tagline =
    'Eduardo Pico Designs is a veteran-owned woodworking and custom fabrication studio serving San Antonio and beyond. Woodworking is at the heart of everything we build, with CNC routing, laser engraving, and UV printing allowing us to create premium custom pieces that stand out.',
  long_description =
    $ep$
We specialize in business branding, custom signs, military and nonprofit awards, golf tournament merchandise, whiskey and cigar accessories, personalized gifts, vendor displays, and home décor. Every project is designed with a focus on quality craftsmanship, clean design, and products that people are proud to display, use, or give as gifts.
$ep$,
  enrichment_status = 'curated',
  updated_at = now()
where slug = 'eduardo-pico-designs';

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
  'migration:sponsor_v32_eduardo_pico_designs_copy',
  'curated',
  now()
from public.sponsors_catalog sc
where sc.slug = 'eduardo-pico-designs'
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
