-- v0.8 — Optional pins for the public podcast landing curated episode strip (21 slots, sort_order 0–20).
-- Server load uses the service role; RLS blocks anon until you add read policies for a future admin UI.

create table if not exists public.podcast_landing_curated_slots (
  sort_order int not null primary key,
  curator_label text,
  youtube_video_id text,
  updated_at timestamptz not null default now(),
  constraint podcast_landing_curated_slots_sort_order_range check (
    sort_order >= 0 and sort_order < 32
  )
);

comment on table public.podcast_landing_curated_slots is
  'Optional overrides for podcast landing curated strip: pin youtube_video_id and/or curator_label per slot index.';

create index if not exists podcast_landing_curated_slots_updated_at_idx
  on public.podcast_landing_curated_slots (updated_at desc);

alter table public.podcast_landing_curated_slots enable row level security;
