-- tORP v0.3 — Sponsor logo enrichment metadata (non-destructive: ADD COLUMN only).
-- Run after sponsors_catalog exists. Does not drop objects or mutate row data.

alter table public.sponsors_catalog
  add column if not exists logo_source_url text,
  add column if not exists logo_source_type text,
  add column if not exists logo_status text,
  add column if not exists logo_last_enriched_at timestamptz,
  add column if not exists logo_review_status text,
  add column if not exists logo_notes text;

comment on column public.sponsors_catalog.logo_url is
  'Public URL for sponsor logo (prefer Supabase Storage); not fetched at render time.';
comment on column public.sponsors_catalog.logo_source_url is
  'Original URL the logo was downloaded from.';
comment on column public.sponsors_catalog.logo_source_type is
  'e.g. apple_touch_icon | site_icon | og_image_logo_hint | site_favicon | storage_upload | manual_curated';
comment on column public.sponsors_catalog.logo_status is
  'pending | found | approved | rejected | fallback | curated';
comment on column public.sponsors_catalog.logo_review_status is
  'pending_review | approved | rejected | curated';
comment on column public.sponsors_catalog.logo_notes is
  'Enrichment or moderator notes.';

-- Storage: create bucket `sponsor-logos` in dashboard (public read if using getPublicUrl).
