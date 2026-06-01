-- Trusted Resource detail-page fields (admin-editable; public read via catalog API).
alter table public.trusted_resources
  add column if not exists mission text,
  add column if not exists who_they_serve text,
  add column if not exists services text,
  add column if not exists service_area text,
  add column if not exists donation_url text,
  add column if not exists volunteer_url text,
  add column if not exists intake_url text,
  add column if not exists events_url text,
  add column if not exists resource_library_url text,
  add column if not exists resource_links jsonb,
  add column if not exists tiktok_url text,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists source_notes text;
