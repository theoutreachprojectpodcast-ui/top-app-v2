-- Community: moderation-first posts, likes, and follow relationships (extend when auth is wired).

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  author_id text not null,
  author_name text not null,
  author_avatar_url text default '',
  title text default '',
  body text not null,
  nonprofit_ein text,
  nonprofit_name text default '',
  category text not null default 'success_story',
  show_author_name boolean not null default true,
  link_url text default '',
  status text not null default 'submitted',
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text default '',
  like_count integer not null default 0,
  share_count integer not null default 0
);

create index if not exists community_posts_status_created_idx
  on public.community_posts (status, created_at desc);

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts (id) on delete cascade,
  liker_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, liker_id)
);

create table if not exists public.community_follows (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

comment on table public.community_posts is 'Moderation-first community stories; only approved rows belong in the public feed.';
comment on column public.community_posts.status is 'draft | submitted | under_review | approved | rejected';

