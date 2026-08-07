-- Saved organizations repair / hardening (2026-07 incident).
-- Non-destructive. Safe to re-run in Supabase SQL editor.
--
-- Goals:
-- 1) Add optional profile_id for reconciliation joins (if missing).
-- 2) Backfill profile_id from WorkOS mapping.
-- 3) Report Support accounts that can save via API but should be migrated to Pro.
-- 4) Refresh directory search MV after IRS imports (when function exists).

-- 1) profile_id column
alter table public.top_app_saved_org_eins
  add column if not exists profile_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'top_app_saved_org_eins_profile_id_fkey'
  ) then
    begin
      alter table public.top_app_saved_org_eins
        add constraint top_app_saved_org_eins_profile_id_fkey
        foreign key (profile_id) references public.top_profiles (id)
        on delete set null;
    exception
      when others then
        raise notice 'profile_id FK not applied: %', sqlerrm;
    end;
  end if;
end
$$;

create index if not exists top_app_saved_org_eins_profile_idx
  on public.top_app_saved_org_eins (profile_id);

-- 2) Backfill profile_id (preserves all rows; no deletes)
update public.top_app_saved_org_eins s
set profile_id = p.id
from public.top_profiles p
where s.profile_id is null
  and nullif(trim(p.workos_user_id), '') is not null
  and p.workos_user_id = s.user_id;

-- 3) Integrity report (read-only selects)
select 'saved_org_totals' as report,
  count(*)::int as saved_rows,
  count(distinct user_id)::int as unique_users,
  count(*) filter (where profile_id is null)::int as missing_profile_id
from public.top_app_saved_org_eins;

select 'support_active_need_migration' as report,
  id, email, workos_user_id, membership_tier, billing_status, membership_source, platform_role
from public.top_profiles
where lower(coalesce(membership_tier, '')) = 'support'
  and lower(coalesce(billing_status, membership_status, '')) in ('active', 'trialing')
order by created_at;

-- 4) Refresh search MV when helper exists
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'refresh_nonprofits_search_app_v1'
  ) then
    perform public.refresh_nonprofits_search_app_v1();
  end if;
end
$$;
