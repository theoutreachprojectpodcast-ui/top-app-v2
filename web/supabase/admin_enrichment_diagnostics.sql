-- =============================================================================
-- tORP — Admin enrichment: runbook + diagnostics (Supabase SQL editor)
-- =============================================================================
-- Use the postgres role or service role in the SQL editor. These statements are
-- read-only except where a block is explicitly marked OPTIONAL / MUTATING.
--
-- --- Schema you typically apply once per environment (idempotent files) ------
--   sponsors_catalog.sql
--   sponsors_catalog_logo_review.sql
--   sponsor_logo_enrichment.sql
--   nonprofit_directory_enrichment.sql   (base table + RLS; if not folded into org_header_image_enrichment)
--   org_header_image_enrichment.sql      (directory + trusted header pipeline columns/policies)
--   trusted_resources.sql                (Trusted Resources catalog; includes header_image_* columns)
--   migrate_legacy_trusted_catalog_table_names.sql  (one-time rename from legacy table names)
--   nonprofit_enrichment_identity.sql, nonprofit_enrichment_research_v2.sql (as needed)
--
-- --- Optional row backfill (review before running) ----------------------------
--   org_header_image_enrichment_backfill_optional.sql  (copies hero_image_url → header when empty)
--
-- --- Node jobs (from repo root: cd web) — require .env.local or env with -------
--   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
--   pnpm enrich:sponsors     — sponsor catalog website → metadata / logo discovery
--   pnpm enrich:logos        — nonprofit logos (batch script)
--   pnpm enrich:media        — nonprofit media
--   pnpm enrich:websites     — nonprofit website discovery
--   pnpm enrich:cities       — city image library (supporting data)
--
-- Moderator flows also exist in-app (service role / staff): under
--   web/src/app/api/admin/orgs/header-image/
--   web/src/app/api/admin/sponsors/logo-enrichment/
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) One-screen summary (single result set)
-- -----------------------------------------------------------------------------
-- Creates and drops a short-lived helper function (needs CREATE on schema public).
-- nonprofit_directory_enrichment and trusted_resources metrics are skipped until those
-- tables exist (information_schema check). sponsors_catalog must exist.

create or replace function public._torp_admin_enrichment_metrics()
returns table(metric text, value text)
language plpgsql
security invoker
set search_path = public
as $$
begin
  return query
  select 'sponsors_catalog rows'::text, count(*)::text from public.sponsors_catalog;

  return query
  select 'sponsors_catalog missing logo_url'::text, count(*)::text
  from public.sponsors_catalog s
  where coalesce(nullif(trim(s.logo_url), ''), '') = '';

  return query
  select 'sponsors logo_review_status = pending'::text, count(*)::text
  from public.sponsors_catalog s
  where s.logo_review_status = 'pending';

  return query
  select 'sponsors logo_review_status = unset'::text, count(*)::text
  from public.sponsors_catalog s
  where s.logo_review_status = 'unset';

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'nonprofit_directory_enrichment'
  ) then
    return query
    select 'nonprofit_directory_enrichment rows'::text, count(*)::text
    from public.nonprofit_directory_enrichment;

    return query
    select 'directory enrichment missing logo_url'::text, count(*)::text
    from public.nonprofit_directory_enrichment e
    where coalesce(nullif(trim(e.logo_url), ''), '') = '';

    return query
    select 'directory enrichment missing header_image_url'::text, count(*)::text
    from public.nonprofit_directory_enrichment e
    where coalesce(nullif(trim(e.header_image_url), ''), '') = '';

    return query
    select 'directory enrichment header pending_review'::text, count(*)::text
    from public.nonprofit_directory_enrichment e
    where e.header_image_review_status = 'pending_review';
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'trusted_resources'
  ) then
    return query
    select 'trusted_resources active missing logo_url'::text, count(*)::text
    from public.trusted_resources p
    where p.listing_status = 'active'
      and coalesce(nullif(trim(p.logo_url), ''), '') = '';

    return query
    select 'trusted_resources active missing header_image_url'::text, count(*)::text
    from public.trusted_resources p
    where p.listing_status = 'active'
      and coalesce(nullif(trim(p.header_image_url), ''), '') = '';

    return query
    select 'trusted_resources active header pending_review'::text, count(*)::text
    from public.trusted_resources p
    where p.listing_status = 'active'
      and p.header_image_review_status = 'pending_review';
  end if;
end;
$$;

select m.metric, m.value
from public._torp_admin_enrichment_metrics() as m
order by m.metric;

drop function public._torp_admin_enrichment_metrics();

-- -----------------------------------------------------------------------------
-- 2) Detail samples (uncomment to inspect specific rows; limit keeps output small)
-- -----------------------------------------------------------------------------
-- select s.slug, s.name, s.logo_url, s.logo_review_status, s.logo_status, s.website_url
-- from public.sponsors_catalog s
-- where coalesce(nullif(trim(s.logo_url), ''), '') = ''
--   -- and coalesce(s.is_active, true)  -- uncomment when is_active column exists
-- order by s.featured desc, s.display_order asc
-- limit 25;

-- select e.ein, e.public_slug, e.logo_url, e.header_image_url, e.header_image_review_status
-- from public.nonprofit_directory_enrichment e
-- where coalesce(nullif(trim(e.header_image_url), ''), '') = ''
-- order by e.updated_at desc nulls last
-- limit 25;

-- select p.ein, p.display_name, p.logo_url, p.header_image_url, p.header_image_review_status
-- from public.trusted_resources p
-- where p.listing_status = 'active'
--   and coalesce(nullif(trim(p.header_image_url), ''), '') = ''
-- order by p.sort_order asc, p.display_name asc
-- limit 25;
