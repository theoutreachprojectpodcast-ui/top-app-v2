-- Optional full-text captions for episode pages + landing “Voices” quotes (backfilled by sync or landing cache).

alter table if exists public.podcast_episodes
  add column if not exists transcript_text text;

alter table if exists public.podcast_episodes
  add column if not exists transcript_fetched_at timestamptz;

comment on column public.podcast_episodes.transcript_text is
  'Plaintext captions/transcript when available (YouTube). Used for short guest pull-quotes on the podcast landing page.';

comment on column public.podcast_episodes.transcript_fetched_at is
  'When transcript_text was last fetched successfully.';
