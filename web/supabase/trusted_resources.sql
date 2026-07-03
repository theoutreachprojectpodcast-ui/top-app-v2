-- Trusted Resources catalog (public listing + application pipeline).
-- Favorites are per-user in the app; they are not stored here.
-- Safe to run multiple times.
--
-- Non-destructive by design (for Supabase SQL editor):
--   No DROP POLICY / DROP TABLE. Policies are created only if missing (see pg_policies checks).
-- If you ever need to change a policy definition in place, drop the policy manually in the
-- dashboard (or a one-off script), then re-run this file.

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

-- Idempotent RLS: deny direct PostgREST access; catalog + applications via Next.js API + service role.
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'trusted_resources'
      and pol.polname = 'trusted_resources_select_active'
  ) then
    drop policy trusted_resources_select_active on public.trusted_resources;
  end if;
  if exists (
    select 1 from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'trusted_resources'
      and pol.polname = 'trusted_resources_insert_pending'
  ) then
    drop policy trusted_resources_insert_pending on public.trusted_resources;
  end if;
  if exists (
    select 1 from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'trusted_resources'
      and pol.polname = 'trusted_resources_update_pending'
  ) then
    drop policy trusted_resources_update_pending on public.trusted_resources;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'trusted_resources'
      and pol.polname = 'trusted_resources_block_anon'
  ) then
    create policy trusted_resources_block_anon on public.trusted_resources
      for all to anon using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'trusted_resources'
      and pol.polname = 'trusted_resources_block_authenticated'
  ) then
    create policy trusted_resources_block_authenticated on public.trusted_resources
      for all to authenticated using (false) with check (false);
  end if;
end
$$;

-- Promote/archive via service role or SQL editor (bypasses RLS).
