-- Optional schema extension for nonprofit media enrichment.
-- Run in Supabase SQL editor if these columns/tables do not exist.

alter table if exists public.nonprofits_search_app_v1
  add column if not exists website text,
  add column if not exists domain text,
  add column if not exists logo_url text,
  add column if not exists logo_status text,
  add column if not exists logo_source text,
  add column if not exists fallback_city text,
  add column if not exists fallback_state text,
  add column if not exists fallback_city_image_url text,
  add column if not exists image_source_type text,
  add column if not exists last_checked_at timestamptz;

create table if not exists public.city_images (
  id bigint generated always as identity primary key,
  city text not null,
  state text not null,
  slug text not null unique,
  image_url text,
  source text,
  last_checked_at timestamptz default now()
);

create unique index if not exists city_images_slug_idx on public.city_images (slug);
