-- TOP production align: torp_* → top_* rename + ensure mobile OAuth handoff table exists.
-- Idempotent — safe to run multiple times in Production Supabase SQL editor.
-- Run BEFORE or right after deploying app code that expects top_* table names.

-- 1) Rename legacy tables when top_* does not yet exist
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

-- 2) Create mobile OAuth handoff table if missing (fixes /api/health/db 503)
create table if not exists public.top_oauth_mobile_handoffs (
  state_key text primary key,
  set_cookies text[] not null default '{}',
  redirect_to text not null default '/',
  expires_at timestamptz not null
);

create index if not exists top_oauth_mobile_handoffs_expires_idx
  on public.top_oauth_mobile_handoffs (expires_at);

alter table public.top_oauth_mobile_handoffs enable row level security;

-- Full client deny (service role bypasses RLS). Inline if helpers not deployed yet.
do $$
begin
  if to_regprocedure('public._top_ensure_client_deny_rls(regclass)') is not null then
    perform public._top_ensure_client_deny_rls('public.top_oauth_mobile_handoffs'::regclass);
  else
    alter table public.top_oauth_mobile_handoffs force row level security;
    drop policy if exists top_oauth_mobile_handoffs_block_anon on public.top_oauth_mobile_handoffs;
    drop policy if exists top_oauth_mobile_handoffs_block_authenticated on public.top_oauth_mobile_handoffs;
    create policy top_oauth_mobile_handoffs_block_anon on public.top_oauth_mobile_handoffs
      as restrictive for all to anon using (false) with check (false);
    create policy top_oauth_mobile_handoffs_block_authenticated on public.top_oauth_mobile_handoffs
      as restrictive for all to authenticated using (false) with check (false);
  end if;
end $$;

alter table public.top_oauth_mobile_handoffs
  add column if not exists set_cookies text[] not null default '{}';

alter table public.top_oauth_mobile_handoffs
  add column if not exists redirect_to text not null default '/';

-- 3) Optional helper function renames
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

-- 4) Quick verification (expect top_oauth_mobile_handoffs + top_profiles)
select
  to_regclass('public.top_profiles') is not null as top_profiles_ok,
  to_regclass('public.top_oauth_mobile_handoffs') is not null as top_oauth_handoffs_ok,
  to_regclass('public.torp_profiles') is not null as legacy_torp_profiles_still_present,
  to_regclass('public.torp_oauth_mobile_handoffs') is not null as legacy_torp_handoffs_still_present;
