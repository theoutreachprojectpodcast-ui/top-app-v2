-- tORP v0.3 — Organization listing header images (directory + trusted resources).
-- Non-destructive: only creates objects that are missing; never drops policies, tables, or columns;
-- does not modify existing row data. Run in Supabase SQL editor or your migration runner.

-- =============================================================================
-- 0) Base table. Idempotent: CREATE IF NOT EXISTS only (never replaces an existing table).
-- =============================================================================

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

-- Add public SELECT policy only when absent (never DROP/replace an existing policy).
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'nonprofit_directory_enrichment'
      and policyname = 'nonprofit_directory_enrichment_select_public'
  ) then
    create policy nonprofit_directory_enrichment_select_public
      on public.nonprofit_directory_enrichment
      for select
      using (true);
  end if;
end $$;

-- =============================================================================
-- 1) Header columns (additive only)
-- =============================================================================
alter table public.nonprofit_directory_enrichment
  add column if not exists header_image_url text,
  add column if not exists header_image_source_url text,
  add column if not exists header_image_source_type text,
  add column if not exists header_image_status text,
  add column if not exists header_image_last_enriched_at timestamptz,
  add column if not exists header_image_review_status text,
  add column if not exists header_image_notes text;

comment on column public.nonprofit_directory_enrichment.header_image_url is
  'Public URL for listing-card header (prefer Supabase Storage); never hot-fetched at render time.';
comment on column public.nonprofit_directory_enrichment.header_image_source_url is
  'Original remote image URL or page the asset was derived from.';
comment on column public.nonprofit_directory_enrichment.header_image_source_type is
  'e.g. official_site_og | official_site_twitter | storage_upload | category_fallback';
comment on column public.nonprofit_directory_enrichment.header_image_status is
  'pending | found | approved | rejected | fallback | curated';
comment on column public.nonprofit_directory_enrichment.header_image_review_status is
  'pending_review | approved | rejected | curated (moderator workflow)';
comment on column public.nonprofit_directory_enrichment.header_image_notes is
  'Enrichment failures, low-confidence reasons, or moderator notes.';

-- =============================================================================
-- 2) Trusted Resources catalog (additive columns only when table exists)
-- =============================================================================
do $$
begin
  if to_regclass('public.proven_allies') is not null then
    alter table public.proven_allies
      add column if not exists header_image_url text,
      add column if not exists header_image_source_url text,
      add column if not exists header_image_source_type text,
      add column if not exists header_image_status text,
      add column if not exists header_image_last_enriched_at timestamptz,
      add column if not exists header_image_review_status text,
      add column if not exists header_image_notes text;
  end if;
end $$;

-- =============================================================================
-- 3) Data backfill (hero → header) is intentionally NOT run here.
--     Optional one-time script: org_header_image_enrichment_backfill_optional.sql
-- =============================================================================

-- =============================================================================
-- 4) Storage: create bucket `org-header-images` in the Supabase dashboard (File storage)
--     with public read if you use getPublicUrl. Service role uploads bypass RLS via API routes.
-- =============================================================================
