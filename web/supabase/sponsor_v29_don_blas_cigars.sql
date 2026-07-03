-- Don Blas Cigars — community sponsor (veteran-owned premium cigars). Idempotent upsert.

begin;

insert into public.sponsors_catalog (
  slug,
  name,
  display_name,
  sponsor_type,
  sponsor_display_group,
  sponsor_category,
  sponsor_scope,
  primary_display_tag,
  website_url,
  instagram_url,
  logo_url,
  short_description,
  tagline,
  long_description,
  featured,
  mission_partner,
  veteran_owned,
  is_active,
  sponsor_status,
  display_order,
  warm_variant,
  verified,
  enrichment_status,
  logo_review_status,
  logo_status,
  social_links,
  updated_at
)
values (
  'don-blas-cigars',
  'Don Blas Cigars',
  'Don Blas Cigars',
  'community_sponsor',
  'community',
  'Premium Aged Cigars',
  'app',
  'Community Sponsor',
  'https://www.instagram.com/db_premiumcigars/',
  'https://www.instagram.com/db_premiumcigars/',
  '/sponsors/don-blas-cigars-logo.png?v=1',
  'Premium Aged Cigars',
  'Tune Out & Light Up',
  $db$
Don Blas is more than a premium cigar company—it's a business built on service, craftsmanship, and community. As a Veteran-Owned company that is also owned and operated by an active-duty service member, Don Blas understands firsthand the values of commitment, sacrifice, and brotherhood that unite our military community.

Every handcrafted cigar reflects a dedication to quality, tradition, and bringing people together. Whether you're celebrating life's victories, sharing stories with friends, or simply taking a moment to slow down, Don Blas is about creating experiences that matter.
$db$,
  true,
  false,
  true,
  true,
  'active',
  22,
  'amber',
  true,
  'curated',
  'approved',
  'approved',
  jsonb_build_object('instagram', 'https://www.instagram.com/db_premiumcigars/'),
  now()
)
on conflict (slug) do update set
  name = excluded.name,
  display_name = excluded.display_name,
  sponsor_type = excluded.sponsor_type,
  sponsor_display_group = excluded.sponsor_display_group,
  sponsor_category = excluded.sponsor_category,
  sponsor_scope = excluded.sponsor_scope,
  primary_display_tag = excluded.primary_display_tag,
  website_url = excluded.website_url,
  instagram_url = excluded.instagram_url,
  logo_url = excluded.logo_url,
  short_description = excluded.short_description,
  tagline = excluded.tagline,
  long_description = excluded.long_description,
  featured = excluded.featured,
  mission_partner = excluded.mission_partner,
  veteran_owned = excluded.veteran_owned,
  is_active = excluded.is_active,
  sponsor_status = excluded.sponsor_status,
  display_order = excluded.display_order,
  warm_variant = excluded.warm_variant,
  verified = excluded.verified,
  enrichment_status = excluded.enrichment_status,
  logo_review_status = excluded.logo_review_status,
  logo_status = excluded.logo_status,
  social_links = excluded.social_links,
  updated_at = now();

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
  'migration:sponsor_v29',
  'curated',
  now()
from public.sponsors_catalog sc
where sc.slug = 'don-blas-cigars'
on conflict (sponsor_id) do update set
  curated_tagline = excluded.curated_tagline,
  curated_short_description = excluded.curated_short_description,
  curated_long_description = excluded.curated_long_description,
  curated_at = excluded.curated_at,
  curated_source = excluded.curated_source,
  enrichment_status = 'curated',
  updated_at = now();

commit;
