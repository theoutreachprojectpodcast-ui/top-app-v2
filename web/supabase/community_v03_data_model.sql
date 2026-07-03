-- TOP v0.3 — Community posts: profile linkage, moderation states, visibility, reactions scaffold.
-- Run after top_profiles exists (top_v03_profiles.sql). Safe to re-run.
-- Idempotent: no DROP POLICY / DROP CONSTRAINT — policies and check constraints are created only when missing.

-- ---------------------------------------------------------------------------
-- Extend community_posts
-- ---------------------------------------------------------------------------
alter table public.community_posts
  add column if not exists author_profile_id uuid references public.top_profiles (id) on delete set null;

alter table public.community_posts
  add column if not exists visibility text;

update public.community_posts set visibility = 'community' where visibility is null;

alter table public.community_posts
  alter column visibility set default 'community';

alter table public.community_posts
  alter column visibility set not null;

alter table public.community_posts
  add column if not exists moderation_notes text;

alter table public.community_posts
  add column if not exists is_edited boolean not null default false;

alter table public.community_posts
  add column if not exists deleted_at timestamptz;

alter table public.community_posts
  add column if not exists published_at timestamptz;

alter table public.community_posts
  add column if not exists post_type text default 'share_story';

alter table public.community_posts
  add column if not exists photo_url text default '';

-- Normalize legacy status values to moderation model (in-place updates; no deletes)
update public.community_posts
set status = 'pending_review'
where status in ('submitted', 'under_review');

update public.community_posts
set status = 'pending_review'
where status not in ('draft', 'pending_review', 'approved', 'rejected', 'hidden');

-- Check constraints: add only if not already present (no drop/replace)
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on c.conrelid = t.oid
    join pg_catalog.pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'community_posts'
      and c.conname = 'community_posts_status_chk'
  ) then
    alter table public.community_posts
      add constraint community_posts_status_chk check (
        status in ('draft', 'pending_review', 'approved', 'rejected', 'hidden')
      );
  end if;
end
$$;

alter table public.community_posts
  alter column status set default 'pending_review';

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on c.conrelid = t.oid
    join pg_catalog.pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'community_posts'
      and c.conname = 'community_posts_visibility_chk'
  ) then
    alter table public.community_posts
      add constraint community_posts_visibility_chk check (
        visibility in ('community', 'private', 'public')
      );
  end if;
end
$$;

create index if not exists community_posts_author_profile_created_idx
  on public.community_posts (author_profile_id, created_at desc);

create index if not exists community_posts_public_feed_idx
  on public.community_posts (status, visibility, created_at desc)
  where deleted_at is null;

comment on column public.community_posts.author_profile_id is 'FK to top_profiles.id; authoritative attribution.';
comment on column public.community_posts.visibility is 'community | private | public';
comment on column public.community_posts.status is 'draft | pending_review | approved | rejected | hidden';

-- ---------------------------------------------------------------------------
-- Reactions (likes); mutations intended via service-role API routes
-- ---------------------------------------------------------------------------
create table if not exists public.community_post_reactions (
  id uuid primary key default gen_random_uuid (),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  profile_id uuid not null references public.top_profiles (id) on delete cascade,
  reaction_type text not null default 'like',
  created_at timestamptz not null default now (),
  constraint community_post_reactions_unique unique (post_id, profile_id, reaction_type),
  constraint community_post_reactions_type_chk check (reaction_type in ('like'))
);

create index if not exists community_post_reactions_post_idx on public.community_post_reactions (post_id);

comment on table public.community_post_reactions is 'Account-backed reactions; use trusted API + service role.';

alter table public.community_post_reactions enable row level security;

-- RLS: deny direct PostgREST access; community feed via /api/community/posts + service role.
alter table public.community_posts enable row level security;

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'community_posts'
      and pol.polname = 'community_posts_anon_public_read'
  ) then
    drop policy community_posts_anon_public_read on public.community_posts;
  end if;
  if exists (
    select 1 from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'community_posts'
      and pol.polname = 'community_posts_authenticated_public_read'
  ) then
    drop policy community_posts_authenticated_public_read on public.community_posts;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'community_posts'
      and pol.polname = 'community_posts_block_anon'
  ) then
    create policy community_posts_block_anon on public.community_posts
      for all to anon using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'community_posts'
      and pol.polname = 'community_posts_block_authenticated'
  ) then
    create policy community_posts_block_authenticated on public.community_posts
      for all to authenticated using (false) with check (false);
  end if;
end
$$;
