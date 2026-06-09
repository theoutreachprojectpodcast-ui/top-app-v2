-- =============================================================================
-- Public schema RLS hardening — deny PostgREST client access by default
-- =============================================================================
-- Principle: The Outreach Project uses WorkOS + Next.js Route Handlers with
-- SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). Anon/authenticated JWT roles must
-- NOT read or write application tables directly.
--
-- Safe to re-run (idempotent). Run in Supabase SQL Editor as postgres.
--
-- After run:
--   select * from public._torp_rls_security_audit() where status <> 'OK' order by 1, 2;
--
-- Re-run after any migration that re-adds permissive policies (trusted_resources.sql, etc.).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public._torp_ensure_client_deny_rls(p_table regclass)
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
    raise notice 'rls_harden: skip missing %', tbl_name;
    return;
  end if;

  execute format('alter table %s enable row level security', p_table);
  execute format('alter table %s force row level security', p_table);

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = short_name and policyname = pol_anon
  ) then
    execute format(
      'create policy %I on %s as restrictive for all to anon using (false) with check (false)',
      pol_anon, p_table
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = short_name and policyname = pol_auth
  ) then
    execute format(
      'create policy %I on %s as restrictive for all to authenticated using (false) with check (false)',
      pol_auth, p_table
    );
  end if;
end;
$$;

comment on function public._torp_ensure_client_deny_rls(regclass) is
  'Enable RLS + restrictive deny-all policies for anon/authenticated PostgREST roles.';

-- Drop legacy permissive policies (direct PostgREST access — app uses service role APIs).
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and policyname in (
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
        'torp_profiles_block_anon',
        'torp_profiles_block_authenticated',
        'top_qa_profiles_block_anon',
        'top_qa_profiles_block_authenticated',
        'torp_org_public_updates_block_anon',
        'torp_org_public_updates_block_authenticated',
        'torp_platform_notifications_block_anon',
        'torp_platform_notifications_block_authenticated',
        'admin_audit_logs_no_client_access',
        'page_content_blocks_no_client_access',
        'admin_media_assets_no_client_access'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    raise notice 'rls_harden: dropped policy % on %', pol.policyname, pol.tablename;
  end loop;

  -- Drop linter-era duplicate deny policies (replaced by _block_anon naming).
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and policyname like '%\_linter\_block\_%' escape '\'
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- Harden every heap table in public (includes legacy ETL tables if present).
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
    perform public._torp_ensure_client_deny_rls(format('public.%I', t.relname)::regclass);
    raise notice 'rls_harden: hardened public.%', t.relname;
  end loop;
end $$;

-- Views: security invoker so underlying table RLS applies to callers (PostgREST anon).
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
  loop
    begin
      execute format('alter view public.%I set (security_invoker = true)', v.view_name);
    exception
      when others then
        raise notice 'rls_harden: view public.% skipped: %', v.view_name, sqlerrm;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Audit helper
-- ---------------------------------------------------------------------------

create or replace function public._torp_rls_security_audit()
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
  pol record;
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

    if exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t.relname
        and p.roles && array['anon', 'authenticated', 'public']::name[]
        and coalesce(p.qual, '') not in ('false', '(false)')
        and coalesce(p.with_check, '') not in ('false', '(false)')
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
      return query select 'view'::text, v.relname, 'WARN'::text, 'security_definer_or_default'::text;
    end if;
  end loop;

  return;
end;
$$;

commit;

-- select * from public._torp_rls_security_audit() where status <> 'OK';
