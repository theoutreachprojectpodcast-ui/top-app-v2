-- Rename legacy torp_* objects to top_* for production databases created before 2026-06.
-- Safe to run once. Skips objects that are already renamed (IF EXISTS / exception handling).
-- Run in Production Supabase SQL editor BEFORE deploying app code that expects top_* names.

do $$
begin
  if to_regclass('public.torp_profiles') is not null
     and to_regclass('public.top_profiles') is null then
    alter table public.torp_profiles rename to top_profiles;
  end if;

  if to_regclass('public.torp_platform_notifications') is not null
     and to_regclass('public.top_platform_notifications') is null then
    alter table public.torp_platform_notifications rename to top_platform_notifications;
  end if;

  if to_regclass('public.torp_org_public_updates') is not null
     and to_regclass('public.top_org_public_updates') is null then
    alter table public.torp_org_public_updates rename to top_org_public_updates;
  end if;

  if to_regclass('public.torp_oauth_mobile_handoffs') is not null
     and to_regclass('public.top_oauth_mobile_handoffs') is null then
    alter table public.torp_oauth_mobile_handoffs rename to top_oauth_mobile_handoffs;
  end if;
end $$;

-- Optional helper renames (no-op if already top_* or never created)
do $$
begin
  if to_regprocedure('public._torp_schema_health()') is not null
     and to_regprocedure('public._top_schema_health()') is null then
    alter function public._torp_schema_health() rename to _top_schema_health;
  end if;
exception when undefined_function then null;
end $$;

do $$
begin
  if to_regprocedure('public._torp_rls_security_audit()') is not null
     and to_regprocedure('public._top_rls_security_audit()') is null then
    alter function public._torp_rls_security_audit() rename to _top_rls_security_audit;
  end if;
exception when undefined_function then null;
end $$;

do $$
begin
  if to_regprocedure('public._torp_admin_enrichment_metrics()') is not null
     and to_regprocedure('public._top_admin_enrichment_metrics()') is null then
    alter function public._torp_admin_enrichment_metrics() rename to _top_admin_enrichment_metrics;
  end if;
exception when undefined_function then null;
end $$;

comment on schema public is 'TOP (The Outreach Project) — torp_* renamed to top_* via rename_torp_tables_to_top_2026_06.sql';
