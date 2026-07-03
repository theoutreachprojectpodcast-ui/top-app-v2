-- tOP v0.6 — podcast playlist source of truth, voice cards, guest apply fields, paid podcast sponsors.
-- Safe / additive. Apply after podcast_content_pipeline_v05 + admin_cms_v05.

begin;

-- Featured “Voices” cards (admin-curated when card_active = true)
alter table if exists public.podcast_episode_featured_guest
  add column if not exists public_quote text;

alter table if exists public.podcast_episode_featured_guest
  add column if not exists card_active boolean not null default false;

alter table if exists public.podcast_episode_featured_guest
  add column if not exists display_order integer not null default 0;

alter table if exists public.podcast_episode_featured_guest
  add column if not exists admin_quote_override boolean not null default false;

comment on column public.podcast_episode_featured_guest.public_quote is
  'Short human-readable quote for the landing card (1–2 sentences).';

comment on column public.podcast_episode_featured_guest.card_active is
  'When true, row is eligible for the curated Voices strip (ordered by display_order).';

-- Guest application extra fields
alter table if exists public.podcast_guest_applications
  add column if not exists phone text;

alter table if exists public.podcast_guest_applications
  add column if not exists role_title text;

alter table if exists public.podcast_guest_applications
  add column if not exists message text;

-- Canonical guest cards model for “Voices shaping service communities”.
-- (Keeps compatibility with existing podcast_guests usage and adds admin-editable quote controls.)
alter table if exists public.podcast_guests
  add column if not exists organization text;

alter table if exists public.podcast_guests
  add column if not exists role_title text;

alter table if exists public.podcast_guests
  add column if not exists quote text;

alter table if exists public.podcast_guests
  add column if not exists episode_id uuid references public.podcast_episodes (id) on delete set null;

alter table if exists public.podcast_guests
  add column if not exists source_url text;

alter table if exists public.podcast_guests
  add column if not exists admin_override boolean not null default false;

alter table if exists public.podcast_guests
  add column if not exists display_order integer not null default 0;

alter table if exists public.podcast_guests
  add column if not exists active boolean not null default false;

create index if not exists podcast_guests_voice_active_idx
  on public.podcast_guests (active, display_order, updated_at desc);

-- Podcast sponsor roster fields (also added in admin_cms_v05 / sponsor_v06; safe if already present).
alter table if exists public.sponsors_catalog
  add column if not exists sponsor_scope text not null default 'app';

alter table if exists public.sponsors_catalog
  add column if not exists payment_status text not null default 'unknown';

-- Known podcast sponsors: scope + paid (idempotent by slug; no-op if rows not seeded yet).
update public.sponsors_catalog
set
  sponsor_scope = 'podcast',
  payment_status = 'paid'
where slug in (
  'rope-solutions',
  'gameday-mens-health',
  'game-day-mens-health',
  'rucking-realty-group',
  'wrecking-realty-group',
  'iron-soldiers-coffee-company',
  'eduardo-pico-designs',
  'wars-end-merch'
);

commit;
