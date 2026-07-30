-- Patch: fix _top_rls_security_audit return type (name → text).
-- Safe to re-run. Paste into Supabase SQL editor after the main RLS migration.

begin;

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
end;
$$;

revoke all on function public._top_rls_security_audit() from public, anon, authenticated;
grant execute on function public._top_rls_security_audit() to service_role;

commit;

-- Then run:
--   select * from public._top_rls_security_audit() where status = 'FAIL';
