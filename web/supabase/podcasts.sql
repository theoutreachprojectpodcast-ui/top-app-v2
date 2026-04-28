create table if not exists public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique,
  title text not null,
  description text,
  published_at timestamptz,
  thumbnail_url text,
  youtube_url text not null,
  duration_seconds integer,
  view_count bigint,
  is_featured boolean not null default false,
  is_member_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.podcast_episodes
  add column if not exists view_count bigint;

create index if not exists podcast_episodes_published_idx
  on public.podcast_episodes (published_at desc);

create table if not exists public.podcast_guests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  title text,
  bio text,
  avatar_url text,
  website_url text,
  instagram_url text,
  linkedin_url text,
  x_url text,
  featured boolean not null default false,
  upcoming boolean not null default false,
  upcoming_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.podcast_guests
  add column if not exists upcoming boolean not null default false;

alter table if exists public.podcast_guests
  add column if not exists upcoming_note text;

create table if not exists public.podcast_episode_guests (
  episode_id uuid not null references public.podcast_episodes (id) on delete cascade,
  guest_id uuid not null references public.podcast_guests (id) on delete cascade,
  role_label text,
  primary key (episode_id, guest_id)
);

create table if not exists public.podcast_guest_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  organization text,
  website_url text,
  social_url text,
  topic_pitch text not null,
  proposed_topic text,
  why_now text,
  why_you_should_be_on text,
  audience_value text,
  social_links text,
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'approved', 'denied', 'needs_follow_up')),
  internal_notes text,
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by text,
  accepted_for_upcoming boolean not null default false
);

alter table if exists public.podcast_guest_applications
  add column if not exists updated_at timestamptz not null default now();
alter table if exists public.podcast_guest_applications
  add column if not exists social_url text;
alter table if exists public.podcast_guest_applications
  add column if not exists proposed_topic text;
alter table if exists public.podcast_guest_applications
  add column if not exists why_you_should_be_on text;
alter table if exists public.podcast_guest_applications
  add column if not exists audience_value text;
alter table if exists public.podcast_guest_applications
  add column if not exists admin_notes text;
alter table if exists public.podcast_guest_applications
  add column if not exists reviewed_at timestamptz;
alter table if exists public.podcast_guest_applications
  add column if not exists reviewed_by text;
alter table if exists public.podcast_guest_applications
  add column if not exists accepted_for_upcoming boolean not null default false;

alter table if exists public.podcast_guest_applications
  drop constraint if exists podcast_guest_applications_status_check;

alter table if exists public.podcast_guest_applications
  add constraint podcast_guest_applications_status_check
  check (status in ('submitted', 'in_review', 'approved', 'denied', 'needs_follow_up'));

create index if not exists podcast_guest_applications_status_idx
  on public.podcast_guest_applications (status, created_at desc);

create table if not exists public.podcast_member_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  content_url text,
  content_type text not null default 'video'
    check (content_type in ('video', 'audio', 'article', 'download')),
  access_tier text not null default 'member'
    check (access_tier in ('member', 'supporter', 'public')),
  published_at timestamptz default now(),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
