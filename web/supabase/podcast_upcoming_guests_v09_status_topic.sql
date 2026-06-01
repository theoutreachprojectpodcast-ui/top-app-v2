-- Expand upcoming-guest workflow statuses + optional episode/topic line.
-- Apply in Supabase SQL editor or via migration runner.

begin;

alter table if exists public.podcast_upcoming_guests
  drop constraint if exists podcast_upcoming_guests_status_chk;

alter table if exists public.podcast_upcoming_guests
  add column if not exists episode_topic text not null default '';

alter table if exists public.podcast_upcoming_guests
  add constraint podcast_upcoming_guests_status_chk
  check (status in ('draft', 'scheduled', 'confirmed', 'published', 'hidden'));

comment on table public.podcast_upcoming_guests is
  'Editorial upcoming guests; public API lists scheduled, confirmed, and published (not draft/hidden).';

comment on column public.podcast_upcoming_guests.episode_topic is
  'Planned episode title or topic for admin reference and optional public teaser copy.';

commit;
