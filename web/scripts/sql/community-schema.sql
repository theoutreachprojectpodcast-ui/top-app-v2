-- Community moderation-first schema (demo-ready, extensible).

create table if not exists public.community_posts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  author_id text not null,
  author_name text not null,
  author_avatar_url text,
  title text,
  body text not null,
  nonprofit_ein text,
  nonprofit_name text,
  post_type text not null default 'share_story',
  category text not null default 'success_story',
  show_author_name boolean not null default true,
  link_url text,
  photo_url text,
  status text not null default 'draft', -- draft|submitted|under_review|approved|rejected
  visibility text not null default 'community',
  like_count integer not null default 0,
  share_count integer not null default 0,
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text
);

create index if not exists community_posts_status_created_idx
  on public.community_posts (status, created_at desc);

create table if not exists public.community_post_likes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  post_id bigint not null references public.community_posts(id) on delete cascade,
  user_id text not null
);

create unique index if not exists community_post_likes_post_user_idx
  on public.community_post_likes (post_id, user_id);

create table if not exists public.community_relationships (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  follower_id text not null,
  following_id text not null,
  status text not null default 'active'
);

create unique index if not exists community_relationships_unique_pair_idx
  on public.community_relationships (follower_id, following_id);

create table if not exists public.community_connection_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  requester_id text not null,
  target_user_id text not null,
  status text not null default 'requested' -- requested|accepted|rejected
);

create unique index if not exists community_connection_requests_unique_pair_idx
  on public.community_connection_requests (requester_id, target_user_id);
