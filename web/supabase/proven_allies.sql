-- Canonical catalog row for each Proven Ally (public listing + application pipeline).
-- Favorites are per-user in the app; they are not stored here.
create table if not exists public.proven_allies (
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
  unique (ein)
);

create index if not exists idx_proven_allies_listing on public.proven_allies (listing_status, sort_order, display_name);

alter table public.proven_allies enable row level security;

drop policy if exists proven_allies_select_active on public.proven_allies;
drop policy if exists proven_allies_insert_pending on public.proven_allies;
drop policy if exists proven_allies_update_pending on public.proven_allies;

-- Public app: only vetted allies are visible.
create policy proven_allies_select_active on public.proven_allies
  for select to anon, authenticated
  using (listing_status = 'active');

-- Application flow: allow inserting pending rows (anon demo + authenticated applicants).
create policy proven_allies_insert_pending on public.proven_allies
  for insert to anon, authenticated
  with check (listing_status = 'pending');

-- Re-application / upsert: keep pending rows editable until staff activates them.
create policy proven_allies_update_pending on public.proven_allies
  for update to anon, authenticated
  using (listing_status = 'pending')
  with check (listing_status = 'pending');

-- Promote/archive via service role or SQL editor (bypasses RLS).
