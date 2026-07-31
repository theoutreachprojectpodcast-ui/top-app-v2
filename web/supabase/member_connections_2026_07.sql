-- ============================================================
-- SAFE TO RUN in Supabase SQL Editor (non-destructive)
-- No DROP / DELETE / TRUNCATE statements.
--
-- Open: https://supabase.com/dashboard/project/xbtfoundwmhrqrbcuqcw/sql/new
-- Paste this whole file → Run
--
-- Note: Friend connections already work via community_follows fallback
-- until this table exists. Applying this upgrades to the dedicated model.
-- ============================================================

-- Persistent member friend connections (profile UUID relationships).
-- Idempotent — safe to re-run. APIs use service role; RLS blocks direct client access.

create table if not exists public.member_connections (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.top_profiles (id) on delete cascade,
  recipient_profile_id uuid not null references public.top_profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'removed', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  blocked_by_profile_id uuid references public.top_profiles (id) on delete set null,
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

comment on table public.member_connections is
  'Friend / member connection requests and accepted relationships between top_profiles rows.';

alter table public.member_connections enable row level security;

-- Ensure API service role can manage rows (RLS still blocks anon/authenticated).
grant select, insert, update, delete on table public.member_connections to service_role;
grant all on table public.member_connections to postgres;

-- Deny browser roles; app uses /api/community/connections + service role.
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

-- Optional collaboration fields on community posts (safe if columns already exist).
alter table public.community_posts
  add column if not exists tagged_profile_ids uuid[] default '{}'::uuid[];

alter table public.community_posts
  add column if not exists tagged_nonprofit_eins text[] default '{}'::text[];

comment on column public.community_posts.tagged_profile_ids is
  'Optional friend profile tags on a community post (collaboration foundation).';

-- Default community posting mode: open (members publish immediately).
insert into public.admin_settings (setting_key, setting_value, updated_at)
values (
  'community_posting_mode',
  '{"mode":"open"}'::jsonb,
  now()
)
on conflict (setting_key) do nothing;
