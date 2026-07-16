-- =============================================================================
-- Supabase Security Advisor remediation — rls_disabled_in_public + exposure
-- Project: xbtfoundwmhrqrbcuqcw (The Outreach Project Directory)
-- Date: 2026-07
-- =============================================================================
-- Safe to re-run (idempotent). Non-destructive: no DROP TABLE / no data deletes.
--
-- Architecture assumption (verified in app code):
--   Production Next.js API routes use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
--   Browser PostgREST must not read private tables; public catalogs are served
--   via trusted server routes (/api/directory/*, /api/sponsors/*, /api/community/*).
--
-- This migration:
--   1) ENABLE + FORCE RLS on every public heap table
--   2) Adds RESTRICTIVE deny policies for anon + authenticated (if missing)
--   3) Sets security_invoker = true on every public view
--   4) Revokes direct client privileges on materialized views (no RLS support)
--   5) Installs public._top_rls_security_audit() for CI / advisor verification
--
-- Apply:
--   SUPABASE_ACCESS_TOKEN=... pnpm --dir web run apply:production:rls:apply
--   — or paste into Supabase SQL editor —
-- Verify:
--   select * from public._top_rls_security_audit() where status = 'FAIL';
--   pnpm --dir web run verify:production-rls
-- =============================================================================

begin;

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

comment on function public._top_ensure_client_deny_rls(regclass) is
  'Enable+force RLS and restrictive deny for anon/authenticated. Service role bypasses RLS.';

-- Every public base table
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
  end loop;
end $$;

-- Views: inherit caller RLS (lint security_definer_view)
do $$
declare
  v record;
begin
  for v in
    select c.relname as view_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
    order by c.relname
  loop
    begin
      execute format('alter view public.%I set (security_invoker = true)', v.view_name);
    exception
      when others then
        raise notice 'security_invoker skipped for view %: %', v.view_name, sqlerrm;
    end;
  end loop;
end $$;

-- Materialized views cannot use RLS — revoke client roles
do $$
declare
  m record;
begin
  for m in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'm'
    order by c.relname
  loop
    begin
      execute format('revoke all on table public.%I from anon, authenticated, public', m.relname);
      execute format('grant select on table public.%I to service_role', m.relname);
    exception
      when others then
        raise notice 'mv revoke skipped for %: %', m.relname, sqlerrm;
    end;
  end loop;
end $$;

-- Audit RPC used by verify:production-rls + CI
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
  m record;
  invoker_val text;
  has_restrictive_deny boolean;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relispartition
    order by c.relname
  loop
    if not (
      select c.relrowsecurity from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t.relname
    ) then
      return query select 'table'::text, t.relname, 'FAIL'::text, 'rls_disabled'::text;
      continue;
    end if;

    if not (
      select c.relforcerowsecurity from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t.relname
    ) then
      return query select 'table'::text, t.relname, 'WARN'::text, 'rls_not_forced'::text;
    end if;

    select exists (
      select 1 from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t.relname
        and p.permissive = 'RESTRICTIVE'
        and p.roles && array['anon', 'authenticated']::name[]
        and coalesce(nullif(trim(both from coalesce(p.qual::text, '')), ''), 'true') in ('false', '(false)')
    ) into has_restrictive_deny;

    if not has_restrictive_deny then
      return query select 'table'::text, t.relname, 'FAIL'::text, 'missing_restrictive_client_deny'::text;
    else
      return query select 'table'::text, t.relname, 'OK'::text, 'rls_deny_clients'::text;
    end if;
  end loop;

  for v in
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
    order by c.relname
  loop
    select coalesce(
      (select option_value from pg_options_to_table(c.reloptions) where option_name = 'security_invoker'),
      'false'
    ) into invoker_val
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = v.relname;

    if invoker_val = 'true' then
      return query select 'view'::text, v.relname, 'OK'::text, 'security_invoker'::text;
    else
      return query select 'view'::text, v.relname, 'FAIL'::text, 'security_definer_or_default'::text;
    end if;
  end loop;

  for m in
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'm'
    order by c.relname
  loop
    if has_table_privilege('anon', format('public.%I', m.relname), 'select')
       or has_table_privilege('authenticated', format('public.%I', m.relname), 'select') then
      return query select 'materialized_view'::text, m.relname, 'FAIL'::text, 'client_select_granted'::text;
    else
      return query select 'materialized_view'::text, m.relname, 'OK'::text, 'client_select_revoked'::text;
    end if;
  end loop;
end;
$$;

revoke all on function public._top_rls_security_audit() from public, anon, authenticated;
grant execute on function public._top_rls_security_audit() to service_role;

revoke all on function public._top_ensure_client_deny_rls(regclass) from public, anon, authenticated;
grant execute on function public._top_ensure_client_deny_rls(regclass) to service_role;

commit;

-- Verify:
--   select * from public._top_rls_security_audit() where status = 'FAIL' order by 1, 2;
