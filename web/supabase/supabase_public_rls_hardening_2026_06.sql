-- =============================================================================
-- Public schema RLS hardening — deny PostgREST client access by default
-- =============================================================================
-- Fixes Supabase linter:
--   • 0013 rls_disabled_in_public — all public heap tables
--   • 0010 security_definer_view — all public views → security_invoker
--
-- Principle: WorkOS + Next.js Route Handlers use SUPABASE_SERVICE_ROLE_KEY
-- (bypasses RLS). Anon/authenticated JWT roles must NOT access app tables.
--
-- Safe to re-run (idempotent). Run in Supabase SQL Editor as postgres.
--
-- Prerequisites: none (includes _top_rls_helpers.sql logic inline on first run)
--
-- After run:
--   select * from public._top_rls_security_audit() where status <> 'OK' order by 1, 2;
--
-- Re-run after any migration that re-adds permissive policies.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Helpers (also in _top_rls_helpers.sql — inlined for Supabase SQL Editor)
-- ---------------------------------------------------------------------------

create or replace function public._top_ensure_client_deny_rls(p_table regclass)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tbl_name text := p_table::text;
  short_name text := split_part(tbl_name, '.', 2);
  pol_anon text := short_name || '_block_anon';
  pol_auth text := short_name || '_block_authenticated';
begin
  if to_regclass(tbl_name) is null then
    raise notice 'rls: skip missing %', tbl_name;
    return;
  end if;

  execute format('alter table %s enable row level security', p_table);
  execute format('alter table %s force row level security', p_table);

  execute format('drop policy if exists %I on %s', pol_anon, p_table);
  execute format('drop policy if exists %I on %s', pol_auth, p_table);

  execute format(
    'create policy %I on %s as restrictive for all to anon using (false) with check (false)',
    pol_anon, p_table
  );
  execute format(
    'create policy %I on %s as restrictive for all to authenticated using (false) with check (false)',
    pol_auth, p_table
  );
end;
$$;

comment on function public._top_ensure_client_deny_rls(regclass) is
  'Enable RLS + restrictive deny-all policies for anon/authenticated PostgREST roles.';

create or replace function public._top_apply_table_rls_if_exists(p_table_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reg regclass;
begin
  reg := to_regclass(format('public.%I', p_table_name));
  if reg is null then
    return;
  end if;
  perform public._top_ensure_client_deny_rls(reg);
end;
$$;

-- ---------------------------------------------------------------------------
-- Drop ALL client-facing policies on public tables (permissive + legacy deny)
-- ---------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and (
        roles && array['anon', 'authenticated', 'public']::name[]
        or policyname like '%\_block\_%' escape '\'
        or policyname like '%\_linter\_block\_%' escape '\'
        or policyname like '%\_no_client_access'
        or policyname in (
          'top_app_saved_org_eins_owner_all',
          'nonprofit_directory_enrichment_select_public',
          'trusted_resources_select_active',
          'trusted_resources_insert_pending',
          'trusted_resources_update_pending',
          'sponsors_catalog_select_public_active',
          'community_posts_anon_public_read',
          'community_posts_authenticated_public_read',
          'Public read podcast episodes',
          'Public read featured guest rows',
          'proven_allies_select_active',
          'proven_allies_insert_pending',
          'proven_allies_update_pending'
        )
      )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    raise notice 'rls_harden: dropped policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Harden every heap table in public (includes legacy ETL tables if present)
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relispartition
    order by c.relname
  loop
    perform public._top_ensure_client_deny_rls(format('public.%I', t.relname)::regclass);
    raise notice 'rls_harden: hardened public.%', t.relname;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Views: security invoker (underlying table RLS applies to callers)
-- ---------------------------------------------------------------------------
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
    order by c.relname
  loop
    begin
      execute format('alter view public.%I set (security_invoker = true)', v.view_name);
      raise notice 'rls_harden: view public.% → security_invoker', v.view_name;
    exception
      when others then
        raise notice 'rls_harden: view public.% skipped: %', v.view_name, sqlerrm;
    end;
  end loop;
end $$;

-- Named legacy directory views (explicit list for audit logging)
do $$
declare
  view_name text;
  view_names text[] := array[
    'vw_aud_first_responders',
    'vw_veterans_geo',
    'nonprofits_search_all',
    'nonprofits_search_app_v1',
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
      continue;
    end if;
    begin
      execute format('alter view public.%I set (security_invoker = true)', view_name);
    exception
      when others then
        raise notice 'rls_harden: named view public.% skipped: %', view_name, sqlerrm;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Audit helper
-- ---------------------------------------------------------------------------
create or replace function public._top_rls_security_audit()
returns table(
  object_type text,
  object_name text,
  status text,
  detail text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  t record;
  v record;
  invoker_val text;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relispartition
    order by c.relname
  loop
    if not (
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t.relname
    ) then
      return query select 'table'::text, t.relname, 'FAIL'::text, 'rls_disabled'::text;
      continue;
    end if;

    if not (
      select c.relforcerowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t.relname
    ) then
      return query select 'table'::text, t.relname, 'WARN'::text, 'rls_not_forced'::text;
      continue;
    end if;

    if exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t.relname
        and p.roles && array['anon', 'authenticated', 'public']::name[]
        and (
          coalesce(nullif(trim(both from coalesce(p.qual::text, '')), ''), 'true') not in ('false', '(false)')
          or coalesce(nullif(trim(both from coalesce(p.with_check::text, '')), ''), 'true') not in ('false', '(false)')
        )
    ) then
      return query select 'table'::text, t.relname, 'WARN'::text, 'permissive_client_policy'::text;
    else
      return query select 'table'::text, t.relname, 'OK'::text, 'rls_deny_clients'::text;
    end if;
  end loop;

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
      return query select 'view'::text, v.relname, 'OK'::text, 'security_invoker'::text;
    else
      return query select 'view'::text, v.relname, 'FAIL'::text, 'security_definer_or_default'::text;
    end if;
  end loop;

  return;
end;
$$;

commit;

-- select * from public._top_rls_security_audit() where status <> 'OK' order by 1, 2;
