-- ============================================================
-- SAFE TO RUN in Supabase SQL Editor (non-destructive)
-- Migrates community_follows friend-graph encodings into
-- public.member_connections, and adds blocked_by_profile_id.
-- Idempotent — safe to re-run.
-- ============================================================

-- Ensure canonical table exists (no-op if already applied).
create table if not exists public.member_connections (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.top_profiles (id) on delete cascade,
  recipient_profile_id uuid not null references public.top_profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'removed', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint member_connections_no_self check (requester_profile_id <> recipient_profile_id)
);

alter table public.member_connections
  add column if not exists blocked_by_profile_id uuid references public.top_profiles (id) on delete set null;

create unique index if not exists member_connections_pair_active_uidx
  on public.member_connections (
    least(requester_profile_id, recipient_profile_id),
    greatest(requester_profile_id, recipient_profile_id)
  )
  where status in ('pending', 'accepted', 'blocked');

create index if not exists member_connections_requester_status_idx
  on public.member_connections (requester_profile_id, status, updated_at desc);

create index if not exists member_connections_recipient_status_idx
  on public.member_connections (recipient_profile_id, status, updated_at desc);

alter table public.member_connections enable row level security;

grant select, insert, update, delete on table public.member_connections to service_role;
grant all on table public.member_connections to postgres;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'member_connections'
      and policyname = 'member_connections_block_anon'
  ) then
    create policy member_connections_block_anon
      on public.member_connections
      as restrictive for all to anon
      using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'member_connections'
      and policyname = 'member_connections_block_authenticated'
  ) then
    create policy member_connections_block_authenticated
      on public.member_connections
      as restrictive for all to authenticated
      using (false) with check (false);
  end if;
end $$;

-- Only migrate when community_follows exists.
do $$
begin
  if to_regclass('public.community_follows') is null then
    raise notice 'community_follows missing — skip backfill';
    return;
  end if;

  -- Pending requests: follower_id → requester, following_id = pending:<recipient>
  insert into public.member_connections (
    requester_profile_id,
    recipient_profile_id,
    status,
    created_at,
    updated_at
  )
  select
    f.follower_id::uuid,
    substring(f.following_id from 9)::uuid,
    'pending',
    coalesce(f.created_at, now()),
    coalesce(f.created_at, now())
  from public.community_follows f
  where f.following_id like 'pending:%'
    and f.follower_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and substring(f.following_id from 9) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and f.follower_id::uuid <> substring(f.following_id from 9)::uuid
    and exists (select 1 from public.top_profiles p where p.id = f.follower_id::uuid)
    and exists (select 1 from public.top_profiles p where p.id = substring(f.following_id from 9)::uuid)
    and not exists (
      select 1
      from public.member_connections mc
      where mc.status in ('pending', 'accepted', 'blocked')
        and least(mc.requester_profile_id, mc.recipient_profile_id)
          = least(f.follower_id::uuid, substring(f.following_id from 9)::uuid)
        and greatest(mc.requester_profile_id, mc.recipient_profile_id)
          = greatest(f.follower_id::uuid, substring(f.following_id from 9)::uuid)
    );

  -- Accepted friendships: undirected pair when both A→B and B→A exist (raw UUIDs).
  insert into public.member_connections (
    requester_profile_id,
    recipient_profile_id,
    status,
    created_at,
    updated_at,
    responded_at
  )
  select
    least(a.follower_id::uuid, a.following_id::uuid),
    greatest(a.follower_id::uuid, a.following_id::uuid),
    'accepted',
    least(coalesce(a.created_at, now()), coalesce(b.created_at, now())),
    greatest(coalesce(a.created_at, now()), coalesce(b.created_at, now())),
    greatest(coalesce(a.created_at, now()), coalesce(b.created_at, now()))
  from public.community_follows a
  inner join public.community_follows b
    on b.follower_id = a.following_id
   and b.following_id = a.follower_id
  where a.follower_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and a.following_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and a.follower_id < a.following_id
    and a.follower_id::uuid <> a.following_id::uuid
    and exists (select 1 from public.top_profiles p where p.id = a.follower_id::uuid)
    and exists (select 1 from public.top_profiles p where p.id = a.following_id::uuid)
    and not exists (
      select 1
      from public.member_connections mc
      where mc.status in ('pending', 'accepted', 'blocked')
        and least(mc.requester_profile_id, mc.recipient_profile_id)
          = least(a.follower_id::uuid, a.following_id::uuid)
        and greatest(mc.requester_profile_id, mc.recipient_profile_id)
          = greatest(a.follower_id::uuid, a.following_id::uuid)
    );

  -- Blocked: follower_id blocked other via following_id = blocked:<other>
  insert into public.member_connections (
    requester_profile_id,
    recipient_profile_id,
    status,
    blocked_by_profile_id,
    created_at,
    updated_at,
    responded_at
  )
  select
    f.follower_id::uuid,
    substring(f.following_id from 9)::uuid,
    'blocked',
    f.follower_id::uuid,
    coalesce(f.created_at, now()),
    coalesce(f.created_at, now()),
    coalesce(f.created_at, now())
  from public.community_follows f
  where f.following_id like 'blocked:%'
    and f.follower_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and substring(f.following_id from 9) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and f.follower_id::uuid <> substring(f.following_id from 9)::uuid
    and exists (select 1 from public.top_profiles p where p.id = f.follower_id::uuid)
    and exists (select 1 from public.top_profiles p where p.id = substring(f.following_id from 9)::uuid)
    and not exists (
      select 1
      from public.member_connections mc
      where mc.status in ('pending', 'accepted', 'blocked')
        and least(mc.requester_profile_id, mc.recipient_profile_id)
          = least(f.follower_id::uuid, substring(f.following_id from 9)::uuid)
        and greatest(mc.requester_profile_id, mc.recipient_profile_id)
          = greatest(f.follower_id::uuid, substring(f.following_id from 9)::uuid)
    );
end $$;

comment on column public.member_connections.blocked_by_profile_id is
  'Profile that initiated the block when status = blocked.';
