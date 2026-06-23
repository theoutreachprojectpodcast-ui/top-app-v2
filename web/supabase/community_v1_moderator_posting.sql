-- Community V1 — moderator-only posting, rich post fields, comments.
-- Run after community_v03_data_model.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Extend community_posts for admin/moderator curated content
-- ---------------------------------------------------------------------------
alter table public.community_posts
  add column if not exists feed_media_json jsonb;

alter table public.community_posts
  add column if not exists feed_layout text;

alter table public.community_posts
  add column if not exists is_pinned boolean not null default false;

alter table public.community_posts
  add column if not exists comments_enabled boolean not null default true;

alter table public.community_posts
  add column if not exists video_url text;

alter table public.community_posts
  add column if not exists podcast_url text;

alter table public.community_posts
  add column if not exists resource_url text;

alter table public.community_posts
  add column if not exists tags text[];

create index if not exists community_posts_pinned_feed_idx
  on public.community_posts (is_pinned desc, created_at desc)
  where deleted_at is null and status = 'approved';

comment on column public.community_posts.is_pinned is 'Pinned posts appear first in the public feed.';
comment on column public.community_posts.comments_enabled is 'When false, comments are disabled for this post.';
comment on column public.community_posts.feed_media_json is 'Carousel slides, resource highlight, captions, etc.';

-- ---------------------------------------------------------------------------
-- Comments on community posts (mutations via service-role API routes)
-- ---------------------------------------------------------------------------
create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid (),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  profile_id uuid not null references public.top_profiles (id) on delete cascade,
  body text not null,
  status text not null default 'published',
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint community_post_comments_status_chk check (status in ('published', 'hidden', 'deleted'))
);

create index if not exists community_post_comments_post_created_idx
  on public.community_post_comments (post_id, created_at asc)
  where status = 'published';

create index if not exists community_post_comments_post_all_idx
  on public.community_post_comments (post_id, created_at asc);

comment on table public.community_post_comments is 'User comments on published community posts; moderated via API.';

alter table public.community_post_comments enable row level security;
