-- =============================================================================
-- Supabase Security Advisor follow-up — functions / RPC exposure
-- Project: xbtfoundwmhrqrbcuqcw (The Outreach Project Directory)
-- Date: 2026-07
-- =============================================================================
-- Addresses remaining Advisor / PostgREST issues after table RLS hardening:
--   • function_search_path_mutable — pin search_path on public functions
--   • Exposed RPCs callable with the publishable (anon) key
--       - public._top_admin_enrichment_metrics()  (admin metrics)
--       - public.show_limit() / show_trgm(...)    (pg_trgm helpers)
--
-- Architecture: browser never needs direct RPC execute; Next.js uses service_role.
-- Safe to re-run. Non-destructive (no DROP / no data changes).
--
-- Apply: paste into Supabase SQL editor, then:
--   select * from public._top_rls_security_audit() where status = 'FAIL';
--   — refresh Database → Advisors → Security —
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Pin search_path on every public function / procedure missing it
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) as cfg(val)
        where cfg.val like 'search_path=%'
      )
  loop
    begin
      execute format('alter function %s set search_path = public, pg_temp', r.sig);
      raise notice 'pinned search_path: %', r.sig;
    exception
      when insufficient_privilege then
        raise notice 'skip search_path (privilege): %', r.sig;
      when others then
        raise notice 'skip search_path (%): %', sqlstate, r.sig;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Deny client EXECUTE on all public functions; allow service_role only
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
  loop
    begin
      execute format(
        'revoke all on function %s from public, anon, authenticated',
        r.sig
      );
      execute format(
        'grant execute on function %s to service_role',
        r.sig
      );
    exception
      when insufficient_privilege then
        raise notice 'skip revoke/grant (privilege): %', r.sig;
      when others then
        raise notice 'skip revoke/grant (%): %', sqlstate, r.sig;
    end;
  end loop;
end $$;

-- Explicit known privileged helpers (idempotent)
do $$
begin
  if to_regprocedure('public._top_admin_enrichment_metrics()') is not null then
    revoke all on function public._top_admin_enrichment_metrics() from public, anon, authenticated;
    grant execute on function public._top_admin_enrichment_metrics() to service_role;
  end if;
  if to_regprocedure('public._top_rls_security_audit()') is not null then
    revoke all on function public._top_rls_security_audit() from public, anon, authenticated;
    grant execute on function public._top_rls_security_audit() to service_role;
  end if;
  if to_regprocedure('public._top_ensure_client_deny_rls(regclass)') is not null then
    revoke all on function public._top_ensure_client_deny_rls(regclass) from public, anon, authenticated;
    grant execute on function public._top_ensure_client_deny_rls(regclass) to service_role;
  end if;
  if to_regprocedure('public._top_linter_security_status()') is not null then
    revoke all on function public._top_linter_security_status() from public, anon, authenticated;
    grant execute on function public._top_linter_security_status() to service_role;
  end if;
  if to_regprocedure('public._top_enable_deny_public_rls(regclass)') is not null then
    revoke all on function public._top_enable_deny_public_rls(regclass) from public, anon, authenticated;
    grant execute on function public._top_enable_deny_public_rls(regclass) to service_role;
  end if;
  if to_regprocedure('public.show_limit()') is not null then
    revoke all on function public.show_limit() from public, anon, authenticated;
  end if;
  if to_regprocedure('public.show_trgm(text)') is not null then
    revoke all on function public.show_trgm(text) from public, anon, authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Extend audit RPC with function privilege + search_path checks
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
set search_path = public, pg_temp
as $$
declare
  t record;
  v record;
  m record;
  f record;
  invoker_val text;
  has_restrictive_deny boolean;
  has_search_path boolean;
  client_exec boolean;
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
      return query select 'table'::text, t.relname::text, 'FAIL'::text, 'rls_disabled'::text;
      continue;
    end if;

    if not (
      select c.relforcerowsecurity from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t.relname
    ) then
      return query select 'table'::text, t.relname::text, 'WARN'::text, 'rls_not_forced'::text;
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
      return query select 'table'::text, t.relname::text, 'FAIL'::text, 'missing_restrictive_client_deny'::text;
    else
      return query select 'table'::text, t.relname::text, 'OK'::text, 'rls_deny_clients'::text;
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
      return query select 'view'::text, v.relname::text, 'OK'::text, 'security_invoker'::text;
    else
      return query select 'view'::text, v.relname::text, 'FAIL'::text, 'security_definer_or_default'::text;
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
      return query select 'materialized_view'::text, m.relname::text, 'FAIL'::text, 'client_select_granted'::text;
    else
      return query select 'materialized_view'::text, m.relname::text, 'OK'::text, 'client_select_revoked'::text;
    end if;
  end loop;

  for f in
    select p.oid::regprocedure::text as sig,
           p.proname::text as name,
           p.proconfig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
      -- Skip operator support / internal helpers that clients never call via PostgREST
      and p.proname not like '%=%'
    order by p.proname, p.oid
  loop
    select exists (
      select 1
      from unnest(coalesce(f.proconfig, array[]::text[])) as cfg(val)
      where cfg.val like 'search_path=%'
    ) into has_search_path;

    if not has_search_path then
      return query select 'function'::text, f.sig, 'FAIL'::text, 'search_path_mutable'::text;
    end if;

    select (
      has_function_privilege('anon', f.sig::regprocedure, 'execute')
      or has_function_privilege('authenticated', f.sig::regprocedure, 'execute')
    ) into client_exec;

    if client_exec then
      return query select 'function'::text, f.sig, 'FAIL'::text, 'client_execute_granted'::text;
    elsif has_search_path then
      return query select 'function'::text, f.sig, 'OK'::text, 'service_only_execute'::text;
    end if;
  end loop;
end;
$$;

revoke all on function public._top_rls_security_audit() from public, anon, authenticated;
grant execute on function public._top_rls_security_audit() to service_role;

commit;

-- Verify:
--   select * from public._top_rls_security_audit() where status = 'FAIL' order by 1, 2;
-- Expect 0 rows. Then refresh Security Advisor in the dashboard.
