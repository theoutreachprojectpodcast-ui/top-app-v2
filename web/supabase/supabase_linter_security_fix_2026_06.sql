-- =============================================================================
-- Supabase Database Linter ΓÇö security fixes (0010 + 0013)
-- =============================================================================
-- Resolves:
--   ΓÇó security_definer_view ΓÇö legacy directory/trusted views
--   ΓÇó rls_disabled_in_public ΓÇö legacy ETL / staging tables in public schema
--
-- Safe to re-run (idempotent). Run in Supabase SQL Editor as postgres.
-- App impact: Next.js uses SUPABASE_SERVICE_ROLE_KEY for server routes (bypasses RLS).
-- Anon/authenticated PostgREST clients lose direct access to locked tables (intended).
--
-- After run: Database ΓåÆ Linter ΓåÆ refresh. Optional check:
--   select * from public._top_linter_security_status() order by 1, 2;
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Views: SECURITY INVOKER (lint 0010)
--    PG15+: alter view ΓÇª set (security_invoker = true)
-- ---------------------------------------------------------------------------

do $$
declare
  view_name text;
  view_names text[] := array[
    'vw_aud_first_responders',
    'vw_veterans_geo',
    'nonprofits_search_all',
    'vw_aud_housing',
    'nonprofits_with_audience',
    'nonprofits_with_websites_v2',
    'nonprofits_directory',
    'vw_aud_basic_needs',
    'vw_veterans_geo_enriched',
    'vw_mental_health_geo',
    'vw_aud_mental_health',
    'trusted_resources_v',
    'nonprofits_with_websites',
    'vw_children_families_geo',
    'vw_housing_geo',
    'vw_aud_veterans',
    'nonprofits_search_all_v2',
    'vw_basic_needs_geo',
    'vw_first_responders_geo',
    'vw_aud_children_families'
  ];
begin
  foreach view_name in array view_names loop
    if to_regclass(format('public.%I', view_name)) is null then
      raise notice 'linter_fix: view public.% skipped (not found)', view_name;
      continue;
    end if;

    begin
      execute format('alter view public.%I set (security_invoker = true)', view_name);
      raise notice 'linter_fix: view public.% set security_invoker=true', view_name;
    exception
      when others then
        raise notice 'linter_fix: view public.% alter failed: %', view_name, sqlerrm;
    end;
  end loop;
end $$;

-- Any remaining public views still flagged as security definer (catch-all)
do $$
declare
  v record;
begin
  for v in
    select c.relname as view_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
      and coalesce(
        (select option_value
         from pg_options_to_table(c.reloptions)
         where option_name = 'security_invoker'),
        'false'
      ) <> 'true'
  loop
    begin
      execute format('alter view public.%I set (security_invoker = true)', v.view_name);
      raise notice 'linter_fix: catch-all view public.% set security_invoker=true', v.view_name;
    exception
      when others then
        raise notice 'linter_fix: catch-all view public.% skipped: %', v.view_name, sqlerrm;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Tables: enable RLS + deny anon/authenticated (lint 0013)
-- ---------------------------------------------------------------------------

create or replace function public._top_enable_deny_public_rls(p_table regclass)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tbl_name text := p_table::text;
  short_name text := split_part(tbl_name, '.', 2);
  pol_anon text := short_name || '_linter_block_anon';
  pol_auth text := short_name || '_linter_block_authenticated';
begin
  if to_regclass(tbl_name) is null then
    raise notice 'linter_fix: table % not found ΓÇö skipped', tbl_name;
    return;
  end if;

  execute format('alter table %s enable row level security', p_table);

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = short_name
      and policyname = pol_anon
  ) then
    execute format(
      'create policy %I on %s for all to anon using (false) with check (false)',
      pol_anon,
      p_table
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = short_name
      and policyname = pol_auth
  ) then
    execute format(
      'create policy %I on %s for all to authenticated using (false) with check (false)',
      pol_auth,
      p_table
    );
  end if;

  raise notice 'linter_fix: RLS enabled on %', tbl_name;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'nonprofit_websites_stage',
    'stg_us_vet_connect',
    'profiles',
    'curated_orgs',
    'favorites',
    'messages',
    'nonprofit_websites',
    'ntee_categories',
    'veteran_org_seed',
    'threads',
    'nonprofit_profiles',
    'nonprofit_audience_flags',
    'irs_veterans_orgs',
    'nonprofit_audience_tags',
    'nonprofit_overrides'
  ];
begin
  foreach t in array tables loop
    perform public._top_enable_deny_public_rls(format('public.%I', t)::regclass);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Diagnostic ΓÇö re-run after linter refresh
-- ---------------------------------------------------------------------------

create or replace function public._top_linter_security_status()
returns table(object_type text, object_name text, status text, detail text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v record;
  t record;
  invoker_val text;
begin
  for v in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
    order by c.relname
  loop
    select coalesce(
      (select option_value from pg_options_to_table(c.reloptions) where option_name = 'security_invoker'),
      'false'
    )
    into invoker_val
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = v.relname;

    if invoker_val = 'true' then
      return query select 'view'::text, v.relname, 'OK'::text, 'security_invoker=true'::text;
    else
      return query select 'view'::text, v.relname, 'WARN'::text, 'security_invoker not true'::text;
    end if;
  end loop;

  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'nonprofit_websites_stage', 'stg_us_vet_connect', 'profiles', 'curated_orgs',
        'favorites', 'messages', 'nonprofit_websites', 'ntee_categories', 'veteran_org_seed',
        'threads', 'nonprofit_profiles', 'nonprofit_audience_flags', 'irs_veterans_orgs',
        'nonprofit_audience_tags', 'nonprofit_overrides'
      )
    order by c.relname
  loop
    if (
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t.relname
    ) then
      return query select 'table'::text, t.relname, 'OK'::text, 'rls_enabled'::text;
    else
      return query select 'table'::text, t.relname, 'FAIL'::text, 'rls_disabled'::text;
    end if;
  end loop;

  return;
end;
$$;

commit;

-- Quick verify (optional):
-- select * from public._top_linter_security_status() where status <> 'OK';
