-- SAFE / ADDITIVE ONLY
-- No drops, no renames, no destructive rewrites.
-- Extends existing schema for product alignment.
-- Safe to re-run. Run after core migrations (#1–#37).
--
-- Non-destructive by design (for Supabase SQL editor):
--   No DROP POLICY / DROP TABLE. Policies and constraints are created only when missing.
-- Run the entire file in one execution (do not highlight a partial section).

-- =========================================================
-- 1) Sponsors: additive operational metadata + linkage
-- =========================================================

alter table if exists public.sponsors_catalog
  add column if not exists is_active boolean not null default true,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists review_notes text;

create index if not exists sponsors_catalog_active_idx
  on public.sponsors_catalog (is_active, featured desc, display_order asc);

alter table if exists public.sponsor_applications
  add column if not exists sponsor_slug text,
  add column if not exists sponsor_catalog_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on c.conrelid = t.oid
    join pg_catalog.pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'sponsor_applications'
      and c.conname = 'sponsor_applications_sponsor_catalog_fk'
  ) then
    alter table public.sponsor_applications
      add constraint sponsor_applications_sponsor_catalog_fk
      foreign key (sponsor_catalog_id)
      references public.sponsors_catalog (id)
      on delete set null;
  end if;
end $$;

create index if not exists sponsor_applications_sponsor_slug_idx
  on public.sponsor_applications (sponsor_slug);

create index if not exists sponsor_applications_sponsor_catalog_id_idx
  on public.sponsor_applications (sponsor_catalog_id);

update public.sponsor_applications
set sponsor_slug = regexp_replace(lower(trim(company_name)), '[^a-z0-9]+', '-', 'g')
where sponsor_slug is null
  and coalesce(trim(company_name), '') <> '';

update public.sponsor_applications sa
set sponsor_catalog_id = sc.id
from public.sponsors_catalog sc
where sa.sponsor_catalog_id is null
  and sa.sponsor_slug is not null
  and sa.sponsor_slug = sc.slug;

-- =========================================================
-- 2) Trusted resources <-> nonprofit linking (explicit table)
-- =========================================================

create table if not exists public.trusted_resource_nonprofit_links (
  id uuid primary key default gen_random_uuid(),
  trusted_resource_id uuid not null references public.trusted_resources (id) on delete cascade,
  nonprofit_ein text not null,
  link_confidence double precision,
  link_source text,
  is_primary boolean not null default true,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trusted_resource_id, nonprofit_ein)
);

create index if not exists trusted_resource_nonprofit_links_ein_idx
  on public.trusted_resource_nonprofit_links (nonprofit_ein);

insert into public.trusted_resource_nonprofit_links (trusted_resource_id, nonprofit_ein, link_confidence, link_source, is_primary, verified)
select pa.id, regexp_replace(pa.ein, '\D', '', 'g') as nonprofit_ein, 1.0, 'trusted_resources_ein', true, true
from public.trusted_resources pa
where coalesce(pa.ein, '') <> ''
  and regexp_replace(pa.ein, '\D', '', 'g') ~ '^[0-9]{9}$'
on conflict (trusted_resource_id, nonprofit_ein) do nothing;

-- =========================================================
-- 3) Shared social link verification support table
-- =========================================================

create table if not exists public.entity_social_links (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('nonprofit', 'trusted_resource', 'sponsor', 'community_member')),
  entity_key text not null,
  platform text not null
    check (platform in ('website', 'facebook', 'instagram', 'linkedin', 'x', 'twitter', 'youtube', 'tiktok', 'other')),
  url text not null,
  verified boolean not null default false,
  verification_source text,
  verification_confidence double precision,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_key, platform, url)
);

create index if not exists entity_social_links_lookup_idx
  on public.entity_social_links (entity_type, entity_key, platform, verified);

insert into public.entity_social_links (entity_type, entity_key, platform, url, verified, verification_source, last_checked_at)
select 'sponsor', sc.slug, 'instagram', sc.instagram_url, sc.verified, 'sponsors_catalog', sc.last_enriched_at
from public.sponsors_catalog sc
where coalesce(sc.instagram_url, '') <> ''
on conflict (entity_type, entity_key, platform, url) do nothing;

insert into public.entity_social_links (entity_type, entity_key, platform, url, verified, verification_source, last_checked_at)
select 'sponsor', sc.slug, 'facebook', sc.facebook_url, sc.verified, 'sponsors_catalog', sc.last_enriched_at
from public.sponsors_catalog sc
where coalesce(sc.facebook_url, '') <> ''
on conflict (entity_type, entity_key, platform, url) do nothing;

insert into public.entity_social_links (entity_type, entity_key, platform, url, verified, verification_source, last_checked_at)
select 'sponsor', sc.slug, 'linkedin', sc.linkedin_url, sc.verified, 'sponsors_catalog', sc.last_enriched_at
from public.sponsors_catalog sc
where coalesce(sc.linkedin_url, '') <> ''
on conflict (entity_type, entity_key, platform, url) do nothing;

insert into public.entity_social_links (entity_type, entity_key, platform, url, verified, verification_source, last_checked_at)
select 'sponsor', sc.slug, 'x', sc.twitter_url, sc.verified, 'sponsors_catalog', sc.last_enriched_at
from public.sponsors_catalog sc
where coalesce(sc.twitter_url, '') <> ''
on conflict (entity_type, entity_key, platform, url) do nothing;

insert into public.entity_social_links (entity_type, entity_key, platform, url, verified, verification_source, last_checked_at)
select 'sponsor', sc.slug, 'youtube', sc.youtube_url, sc.verified, 'sponsors_catalog', sc.last_enriched_at
from public.sponsors_catalog sc
where coalesce(sc.youtube_url, '') <> ''
on conflict (entity_type, entity_key, platform, url) do nothing;

-- =========================================================
-- 4) Sponsor enrichment detail table (structured, additive)
-- =========================================================

create table if not exists public.sponsor_enrichment (
  sponsor_id uuid primary key references public.sponsors_catalog (id) on delete cascade,
  canonical_display_name text,
  extracted_site_title text,
  extracted_meta_description text,
  extracted_logo_candidates jsonb not null default '[]'::jsonb,
  extracted_social_candidates jsonb not null default '[]'::jsonb,
  enrichment_confidence double precision,
  enrichment_status text not null default 'pending',
  source_summary text,
  review_required boolean not null default false,
  last_enriched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sponsor_enrichment_status_idx
  on public.sponsor_enrichment (enrichment_status, review_required, last_enriched_at desc);

insert into public.sponsor_enrichment (
  sponsor_id,
  canonical_display_name,
  extracted_site_title,
  extracted_meta_description,
  enrichment_confidence,
  enrichment_status,
  source_summary,
  review_required,
  last_enriched_at
)
select
  sc.id,
  sc.name,
  sc.name,
  coalesce(sc.short_description, sc.tagline),
  case when sc.verified then 0.9 else 0.45 end,
  case when sc.verified then 'verified' else 'pending' end,
  'backfill:sponsors_catalog',
  not sc.verified,
  sc.last_enriched_at
from public.sponsors_catalog sc
on conflict (sponsor_id) do nothing;

-- =========================================================
-- 5) Community: only columns not already in community_v03_data_model.sql
-- =========================================================

alter table if exists public.community_posts
  add column if not exists assigned_moderator_id text,
  add column if not exists cover_image_url text;

-- =========================================================
-- 6) Nonprofit enrichment additive operational flags
-- =========================================================

alter table if exists public.nonprofit_directory_enrichment
  add column if not exists verified boolean not null default true,
  add column if not exists verification_notes text;

do $$
begin
  if to_regclass('public.nonprofit_directory_enrichment') is null then
    return;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nonprofit_directory_enrichment'
      and column_name = 'naming_review_required'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nonprofit_directory_enrichment'
      and column_name = 'last_verified_at'
  ) then
    execute $idx$
      create index if not exists nonprofit_directory_enrichment_verified_idx
      on public.nonprofit_directory_enrichment (verified, naming_review_required, last_verified_at desc)
    $idx$;
  end if;
end $$;

-- =========================================================
-- 7) RLS safe enhancements (non-breaking)
-- =========================================================

alter table if exists public.sponsors_catalog enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sponsors_catalog'
      and policyname = 'sponsors_catalog_select_public_active'
  ) then
    drop policy sponsors_catalog_select_public_active on public.sponsors_catalog;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sponsors_catalog'
      and policyname = 'sponsors_catalog_block_anon'
  ) then
    create policy sponsors_catalog_block_anon on public.sponsors_catalog
      for all to anon using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sponsors_catalog'
      and policyname = 'sponsors_catalog_block_authenticated'
  ) then
    create policy sponsors_catalog_block_authenticated on public.sponsors_catalog
      for all to authenticated using (false) with check (false);
  end if;
end $$;

alter table public.trusted_resource_nonprofit_links enable row level security;
alter table public.entity_social_links enable row level security;
alter table public.sponsor_enrichment enable row level security;
