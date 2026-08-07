-- ============================================================
-- PRODUCTION FIX — paste ALL of this into Supabase SQL Editor → Run
-- Project: https://supabase.com/dashboard/project/xbtfoundwmhrqrbcuqcw/sql/new
--
-- Why the previous paste failed:
--   The DO $$ … END $$ block hit a parser error and the editor rolled
--   the whole script back (including grants + timestamp columns).
--
-- This version uses only plain ALTER/GRANT statements.
-- ============================================================

-- A) Timestamp columns
alter table public.member_connections
  add column if not exists accepted_at timestamptz;

alter table public.member_connections
  add column if not exists declined_at timestamptz;

alter table public.member_connections
  add column if not exists cancelled_at timestamptz;

alter table public.member_connections
  add column if not exists removed_at timestamptz;

alter table public.member_connections
  add column if not exists blocked_by_profile_id uuid references public.top_profiles (id) on delete set null;

update public.member_connections
set accepted_at = coalesce(accepted_at, responded_at, updated_at)
where status = 'accepted' and accepted_at is null;

update public.member_connections
set declined_at = coalesce(declined_at, responded_at, updated_at)
where status = 'declined' and declined_at is null;

update public.member_connections
set cancelled_at = coalesce(cancelled_at, responded_at, updated_at)
where status = 'cancelled' and cancelled_at is null;

update public.member_connections
set removed_at = coalesce(removed_at, responded_at, updated_at)
where status = 'removed' and removed_at is null;

-- B) CRITICAL: service_role must read/write this table (API uses it)
grant select, insert, update, delete on table public.member_connections to service_role;
grant all on table public.member_connections to postgres;
alter table public.member_connections enable row level security;

-- C) Friends post visibility (no DO block)
alter table public.community_posts
  drop constraint if exists community_posts_visibility_chk;

alter table public.community_posts
  add constraint community_posts_visibility_chk
  check (visibility in ('community', 'private', 'public', 'friends'));

comment on column public.community_posts.visibility is 'community | private | public | friends';

create index if not exists community_posts_friends_visibility_idx
  on public.community_posts (author_profile_id, created_at desc)
  where deleted_at is null and status = 'approved' and visibility = 'friends';

-- D) Quick verification (should return true / column names)
select
  has_table_privilege('service_role', 'public.member_connections', 'SELECT') as service_can_select,
  has_table_privilege('service_role', 'public.member_connections', 'INSERT') as service_can_insert;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'member_connections'
  and column_name in ('accepted_at', 'declined_at', 'cancelled_at', 'removed_at')
order by column_name;
