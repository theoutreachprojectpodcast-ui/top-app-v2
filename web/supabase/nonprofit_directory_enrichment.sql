-- Extended nonprofit directory metadata (one row per organization, keyed by normalized 9-digit EIN).
-- Canonical listing data stays in nonprofits_search_app_v1 / upstream tables; this table is additive enrichment only.
-- Social URLs are stored here with per-platform verification flags — the app only renders icons when verified = true.

create table if not exists public.nonprofit_directory_enrichment (
  ein text primary key check (ein ~ '^[0-9]{9}$'),

  public_slug text unique,

  headline text,
  tagline text,
  short_description text,
  long_description text,
  mission_statement text,
  service_area text,
  founded_year integer,

  website_url text,

  logo_url text,
  hero_image_url text,
  thumbnail_url text,

  header_image_url text,
  header_image_source_url text,
  header_image_source_type text,
  header_image_status text,
  header_image_last_enriched_at timestamptz,
  header_image_review_status text,
  header_image_notes text,

  facebook_url text,
  instagram_url text,
  linkedin_url text,
  x_url text,
  youtube_url text,
  tiktok_url text,

  facebook_verified boolean not null default false,
  instagram_verified boolean not null default false,
  linkedin_verified boolean not null default false,
  x_verified boolean not null default false,
  youtube_verified boolean not null default false,
  tiktok_verified boolean not null default false,

  metadata_source text,
  profile_enriched_at timestamptz,
  last_verified_at timestamptz,

  ein_identity_verified boolean not null default true,
  identity_verified_at timestamptz,

  display_name_on_site text,
  canonical_display_name text,
  website_verified_name text,
  irs_name text,
  legal_name text,
  naming_confidence double precision,
  naming_source_summary text,
  naming_status text,
  naming_last_checked_at timestamptz,
  naming_verified_at timestamptz,
  naming_review_required boolean not null default false,
  research_status text,
  research_confidence double precision,
  source_summary text,
  web_search_supplemented boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nonprofit_directory_enrichment_slug_idx
  on public.nonprofit_directory_enrichment (public_slug)
  where public_slug is not null;

alter table public.nonprofit_directory_enrichment enable row level security;

drop policy if exists nonprofit_directory_enrichment_select_public on public.nonprofit_directory_enrichment;
create policy nonprofit_directory_enrichment_select_public
  on public.nonprofit_directory_enrichment
  for select
  using (true);

-- Writes are intended for service role / SQL editor / trusted ingestion jobs — no anon insert/update policy.
