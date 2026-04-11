-- Trusted Resources catalog (public listing + application pipeline).
-- Favorites are per-user in the app; they are not stored here.
create table if not exists public.trusted_resources (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ein text not null,
  display_name text not null,
  website_url text null,
  logo_url text null,
  city text null,
  state text null,
  location_label text null,
  nonprofit_type text null,
  ntee_code text null,
  category_key text null,
  short_description text null,
  instagram_url text null,
  facebook_url text null,
  youtube_url text null,
  x_url text null,
  linkedin_url text null,
  serves_veterans boolean not null default true,
  serves_first_responders boolean not null default false,
  listing_status text not null default 'pending'
    check (listing_status in ('pending', 'active', 'archived')),
  sort_order int not null default 0,
  application_submission_ref text null,
  header_image_url text null,
  header_image_source_url text null,
  header_image_source_type text null,
  header_image_status text null,
  header_image_last_enriched_at timestamptz null,
  header_image_review_status text null,
  header_image_notes text null,
  unique (ein)
);

create index if not exists idx_trusted_resources_listing on public.trusted_resources (listing_status, sort_order, display_name);

alter table public.trusted_resources enable row level security;

drop policy if exists trusted_resources_select_active on public.trusted_resources;
drop policy if exists trusted_resources_insert_pending on public.trusted_resources;
drop policy if exists trusted_resources_update_pending on public.trusted_resources;

create policy trusted_resources_select_active on public.trusted_resources
  for select to anon, authenticated
  using (listing_status = 'active');

create policy trusted_resources_insert_pending on public.trusted_resources
  for insert to anon, authenticated
  with check (listing_status = 'pending');

create policy trusted_resources_update_pending on public.trusted_resources
  for update to anon, authenticated
  using (listing_status = 'pending')
  with check (listing_status = 'pending');

-- Promote/archive via service role or SQL editor (bypasses RLS).
