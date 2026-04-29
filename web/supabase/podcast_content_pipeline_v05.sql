-- Podcast content pipeline v0.5: episode classification, sync logs, featured-guest enrichment
-- Apply in Supabase SQL editor or via migration tooling.

alter table if exists public.podcast_episodes
  add column if not exists episode_number integer;

alter table if exists public.podcast_episodes
  add column if not exists pipeline_decision text;

alter table if exists public.podcast_episodes
  add column if not exists pipeline_reason text;

alter table if exists public.podcast_episodes
  add column if not exists pipeline_evaluated_at timestamptz;

alter table if exists public.podcast_episodes
  add column if not exists manual_override text;

alter table if exists public.podcast_episodes
  add column if not exists content_source text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'podcast_episodes_manual_override_check'
  ) then
    alter table public.podcast_episodes
      add constraint podcast_episodes_manual_override_check
      check (manual_override is null or manual_override in ('include', 'exclude'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'podcast_episodes_pipeline_decision_check'
  ) then
    alter table public.podcast_episodes
      add constraint podcast_episodes_pipeline_decision_check
      check (
        pipeline_decision is null
        or pipeline_decision in ('accepted', 'rejected', 'pending')
      );
  end if;
end $$;

create index if not exists podcast_episodes_pipeline_published_idx
  on public.podcast_episodes (published_at desc)
  where pipeline_decision = 'accepted';

create table if not exists public.podcast_sync_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  level text not null default 'info',
  message text not null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists podcast_sync_logs_created_idx
  on public.podcast_sync_logs (created_at desc);

create table if not exists public.podcast_episode_featured_guest (
  youtube_video_id text primary key,
  episode_id uuid references public.podcast_episodes (id) on delete set null,
  public_slug text not null unique,
  guest_name text not null,
  organization text,
  role_title text,
  short_bio text,
  discussion_summary text,
  profile_image_url text,
  admin_profile_image_url text,
  source_urls jsonb not null default '[]'::jsonb,
  confidence_score numeric(5, 4) not null default 0,
  last_enriched_at timestamptz,
  verified_for_public boolean not null default false,
  admin_notes text,
  updated_at timestamptz not null default now()
);

create index if not exists podcast_episode_featured_guest_episode_idx
  on public.podcast_episode_featured_guest (episode_id);

-- Public read for podcast landing (adjust if you use stricter RLS elsewhere)
alter table public.podcast_episodes enable row level security;
alter table public.podcast_episode_featured_guest enable row level security;

drop policy if exists "Public read podcast episodes" on public.podcast_episodes;
create policy "Public read podcast episodes"
  on public.podcast_episodes for select
  using (
    manual_override = 'include'
    or (
      coalesce(manual_override, '') <> 'exclude'
      and coalesce(pipeline_decision, '') <> 'rejected'
    )
  );

drop policy if exists "Public read featured guest rows" on public.podcast_episode_featured_guest;
create policy "Public read featured guest rows"
  on public.podcast_episode_featured_guest for select
  using (true);
