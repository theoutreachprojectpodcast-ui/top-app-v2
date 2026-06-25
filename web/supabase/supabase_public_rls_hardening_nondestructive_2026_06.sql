-- =============================================================================
-- Public schema RLS hardening — NON-DESTRUCTIVE (no DROP POLICY)
-- =============================================================================
-- Use this when Supabase SQL Editor shows a "destructive operation" warning
-- for supabase_public_rls_hardening_2026_06.sql (that file mass-drops policies).
--
-- Fixes Supabase linter 0013 (rls_disabled_in_public) and 0010 (views).
--
-- How it secures tables WITHOUT removing existing policies:
--   • ENABLE + FORCE RLS on every public table
--   • Adds RESTRICTIVE deny policies for anon/authenticated (if missing)
--   • PostgreSQL: (permissive OR …) AND (restrictive AND …) → deny blocks anon
--
-- Production Next.js uses service role (bypasses RLS). Safe to re-run.
--
-- After run:
--   select * from public._top_rls_security_audit() where status <> 'OK' order by 1, 2;
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
  'Enable RLS + restrictive deny for anon/authenticated (no DROP — safe for Supabase editor).';

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
        raise notice 'rls_safe: view public.% skipped: %', v.view_name, sqlerrm;
    end;
  end loop;
end $$;

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
      continue;
    end if;

    if exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = t.relname
        and p.roles && array['anon', 'authenticated', 'public']::name[]
        and (
          coalesce(nullif(trim(both from coalesce(p.qual::text, '')), ''), 'true') not in ('false', '(false)')
          or coalesce(nullif(trim(both from coalesce(p.with_check::text, '')), ''), 'true') not in ('false', '(false)')
        )
    ) then
      return query select 'table'::text, t.relname, 'WARN'::text, 'legacy_permissive_policy_present'::text;
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
end;
$$;

commit;

-- Verify (FAIL rows should be 0; WARN legacy_permissive is OK — deny policies still block anon):
-- select * from public._top_rls_security_audit() where status = 'FAIL' order by 1, 2;
