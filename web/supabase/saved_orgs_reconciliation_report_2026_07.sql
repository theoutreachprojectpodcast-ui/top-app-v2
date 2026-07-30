-- Read-only diagnostics for saved-organization identity health.
-- Safe for Supabase SQL editor: SELECT-only (no DDL/DML).

-- 1) Profile identity coverage
select
  count(*)::int as profiles_total,
  count(*) filter (where nullif(trim(workos_user_id), '') is not null)::int as with_workos_id,
  count(*) filter (where nullif(trim(workos_user_id), '') is null)::int as missing_workos_id
from public.top_profiles;

-- 2) Duplicate WorkOS mappings
select workos_user_id, count(*)::int as profile_count
from public.top_profiles
where nullif(trim(workos_user_id), '') is not null
group by workos_user_id
having count(*) > 1
order by profile_count desc
limit 100;

-- 3) Saved-org volume
select
  count(*)::int as saved_rows,
  count(distinct user_id)::int as distinct_users
from public.top_app_saved_org_eins;

-- 4) Orphan saved rows (no matching WorkOS profile)
select s.user_id, count(*)::int as saved_count
from public.top_app_saved_org_eins s
left join public.top_profiles p on p.workos_user_id = s.user_id
where p.id is null
group by s.user_id
order by saved_count desc
limit 200;

-- 5) Invalid EIN values
select user_id, ein
from public.top_app_saved_org_eins
where ein !~ '^[0-9]{9}$'
limit 200;
