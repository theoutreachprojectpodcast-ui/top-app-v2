-- ============================================================
-- SAFE TO RUN in Supabase SQL Editor (non-destructive)
-- Member connections workflow completion:
--   * Explicit status timestamps on member_connections
--   * friends visibility for community_posts
-- Idempotent — safe to re-run.
-- ============================================================

-- Status-specific timestamps (responded_at remains for backwards compatibility).
alter table public.member_connections
  add column if not exists accepted_at timestamptz;

alter table public.member_connections
  add column if not exists declined_at timestamptz;

alter table public.member_connections
  add column if not exists cancelled_at timestamptz;

alter table public.member_connections
  add column if not exists removed_at timestamptz;

comment on column public.member_connections.accepted_at is 'When status became accepted.';
comment on column public.member_connections.declined_at is 'When status became declined.';
comment on column public.member_connections.cancelled_at is 'When status became cancelled by requester.';
comment on column public.member_connections.removed_at is 'When an accepted friendship was removed.';

-- Backfill timestamps from responded_at where possible.
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

-- Ensure service_role can manage connections (documented production failure mode).
grant select, insert, update, delete on table public.member_connections to service_role;
grant all on table public.member_connections to postgres;

-- Friends-only post visibility (in addition to community | private | public).
do $$
declare
  conname text;
begin
  select c.conname into conname
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_class t on c.conrelid = t.oid
  join pg_catalog.pg_namespace n on t.relnamespace = n.oid
  where n.nspname = 'public'
    and t.relname = 'community_posts'
    and c.conname = 'community_posts_visibility_chk';

  if conname is not null then
    execute format('alter table public.community_posts drop constraint %I', conname);
  end if;

  alter table public.community_posts
    add constraint community_posts_visibility_chk check (
      visibility in ('community', 'private', 'public', 'friends')
    );
exception
  when duplicate_object then
    null;
end
$$;

comment on column public.community_posts.visibility is 'community | private | public | friends';

create index if not exists community_posts_friends_visibility_idx
  on public.community_posts (author_profile_id, created_at desc)
  where deleted_at is null and status = 'approved' and visibility = 'friends';
