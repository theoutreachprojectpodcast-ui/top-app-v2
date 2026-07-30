-- Trusted resources: stable public slugs, legacy aliases, verification metadata.
-- Idempotent. Run in Supabase SQL editor as postgres (Dashboard → SQL).
--
-- NOTE: Production tables use FORCE ROW LEVEL SECURITY. Data backfills therefore
-- run with `row_security = off` for this transaction only (postgres/superuser).
-- Client roles (anon/authenticated) remain denied via restrictive policies.

begin;

-- Public slug (canonical route: /trusted/[slug])
alter table public.trusted_resources
  add column if not exists slug text;

-- Legacy / renamed slug redirects
create table if not exists public.trusted_resource_slug_aliases (
  id uuid primary key default gen_random_uuid(),
  trusted_resource_id uuid not null references public.trusted_resources(id) on delete cascade,
  legacy_slug text not null,
  created_at timestamptz not null default now(),
  constraint trusted_resource_slug_aliases_legacy_slug_key unique (legacy_slug)
);

create index if not exists trusted_resource_slug_aliases_resource_idx
  on public.trusted_resource_slug_aliases (trusted_resource_id);

-- Verification / enrichment metadata (admin-facing; not required for public render)
alter table public.trusted_resources
  add column if not exists verification_status text,
  add column if not exists last_verified_at timestamptz,
  add column if not exists field_locks jsonb not null default '{}'::jsonb,
  add column if not exists data_quality_status text;

comment on column public.trusted_resources.slug is 'Canonical public URL segment for /trusted/[slug]';
comment on column public.trusted_resources.verification_status is
  'verified | admin_reviewed | imported_awaiting_review | refresh_recommended | source_unavailable | incomplete';
comment on column public.trusted_resources.field_locks is
  'Map of field_name -> true when admin locked field against enrichment overwrite';

-- Bypass FORCE RLS for migration writes in this transaction only
set local row_security = off;

-- Backfill slugs from display_name when missing (deterministic kebab; uniqueness enforced below)
update public.trusted_resources tr
set slug = trim(both '-' from regexp_replace(lower(regexp_replace(coalesce(tr.display_name, 'trusted-resource'), '[^a-zA-Z0-9]+', '-', 'g')), '-+', '-', 'g'))
where tr.slug is null or btrim(tr.slug) = '';

-- Resolve duplicate slugs by appending short id suffix
with ranked as (
  select
    id,
    slug,
    row_number() over (partition by lower(slug) order by sort_order asc nulls last, created_at asc nulls last, id) as rn
  from public.trusted_resources
  where slug is not null and btrim(slug) <> ''
)
update public.trusted_resources tr
set slug = tr.slug || '-' || substr(replace(tr.id::text, '-', ''), 1, 6)
from ranked r
where tr.id = r.id and r.rn > 1;

-- Unique index on lower(slug) for published lookup
create unique index if not exists trusted_resources_slug_lower_uidx
  on public.trusted_resources (lower(slug))
  where slug is not null and btrim(slug) <> '';

create index if not exists trusted_resources_listing_status_idx
  on public.trusted_resources (listing_status);

create index if not exists trusted_resources_featured_idx
  on public.trusted_resources (featured)
  where featured is true;

create index if not exists trusted_resources_display_name_idx
  on public.trusted_resources (display_name);

create index if not exists trusted_resources_category_key_idx
  on public.trusted_resources (category_key);

-- RLS: match production hardening (ENABLE + FORCE + restrictive deny for anon/authenticated).
-- Prefer shared helper when callable; otherwise apply equivalent policies inline.
do $$
begin
  if to_regprocedure('public._top_ensure_client_deny_rls(regclass)') is not null then
    begin
      perform public._top_ensure_client_deny_rls('public.trusted_resources'::regclass);
      perform public._top_ensure_client_deny_rls('public.trusted_resource_slug_aliases'::regclass);
      return;
    exception
      when insufficient_privilege then
        raise notice 'helper execute denied; applying inline RLS';
      when others then
        raise notice 'helper failed (%); applying inline RLS', sqlstate;
    end;
  end if;

  alter table public.trusted_resources enable row level security;
  alter table public.trusted_resources force row level security;
  alter table public.trusted_resource_slug_aliases enable row level security;
  alter table public.trusted_resource_slug_aliases force row level security;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trusted_resource_slug_aliases'
      and policyname = 'trusted_resource_slug_aliases_block_anon'
  ) then
    create policy trusted_resource_slug_aliases_block_anon
      on public.trusted_resource_slug_aliases
      as restrictive for all to anon
      using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trusted_resource_slug_aliases'
      and policyname = 'trusted_resource_slug_aliases_block_authenticated'
  ) then
    create policy trusted_resource_slug_aliases_block_authenticated
      on public.trusted_resource_slug_aliases
      as restrictive for all to authenticated
      using (false) with check (false);
  end if;
end $$;

commit;
