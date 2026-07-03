-- Shared RLS helpers — run once before other migrations (or via supabase_public_rls_hardening).
-- Idempotent. Safe to re-run.

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

-- Apply to one table when helper exists; otherwise enable RLS only (policies added by hardening).
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
