-- Extended Trusted Resource detail fields (overview, scrape provenance, review).
alter table public.trusted_resources
  add column if not exists long_description text,
  add column if not exists detail_field_sources jsonb default '{}'::jsonb,
  add column if not exists detail_scraped_at timestamptz,
  add column if not exists detail_review_status text,
  add column if not exists featured boolean default false;
