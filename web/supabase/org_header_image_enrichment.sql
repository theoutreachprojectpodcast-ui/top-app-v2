-- tORP v0.3 — Organization listing header images (directory + trusted resources).
-- Reviewable, DB-backed metadata; app renders from stored URLs only (no live image fetch on page load).
-- Run in Supabase SQL editor or your migration runner.

-- 1) Directory enrichment (one row per EIN): canonical header pipeline fields.
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

-- 2) Trusted Resources catalog overrides (optional per listing when enrichment is absent or needs override).
alter table public.proven_allies
  add column if not exists header_image_url text,
  add column if not exists header_image_source_url text,
  add column if not exists header_image_source_type text,
  add column if not exists header_image_status text,
  add column if not exists header_image_last_enriched_at timestamptz,
  add column if not exists header_image_review_status text,
  add column if not exists header_image_notes text;

-- 3) Optional: backfill header from legacy hero when header is empty (one-time safe merge).
update public.nonprofit_directory_enrichment e
set
  header_image_url = coalesce(nullif(trim(e.header_image_url), ''), nullif(trim(e.hero_image_url), '')),
  header_image_source_type = coalesce(e.header_image_source_type, 'legacy_hero_image_url'),
  header_image_status = coalesce(nullif(trim(e.header_image_status), ''), 'found'),
  header_image_review_status = coalesce(nullif(trim(e.header_image_review_status), ''), 'pending_review')
where
  coalesce(nullif(trim(e.header_image_url), ''), '') = ''
  and coalesce(nullif(trim(e.hero_image_url), ''), '') <> '';

-- 4) Storage: create a public bucket `org-header-images` in the Supabase dashboard (File storage)
--    with a public read policy for anonymous SELECT if cards load images from the public URL.
--    Service role uploads bypass RLS via API routes.
