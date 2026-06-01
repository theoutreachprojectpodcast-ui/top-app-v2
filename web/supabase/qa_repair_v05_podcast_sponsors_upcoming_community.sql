-- tOP v0.5 QA repair: sponsor scope (app vs podcast), upcoming guests, demo community flag.
-- Safe / additive. Run against Supabase after prior sponsor + community migrations.

begin;

-- ---------------------------------------------------------------------------
-- 1) sponsors_catalog.sponsor_scope — app (default) vs podcast
-- ---------------------------------------------------------------------------
alter table public.sponsors_catalog
  add column if not exists sponsor_scope text not null default 'app';

comment on column public.sponsors_catalog.sponsor_scope is
  'app = main /sponsors hub; podcast = podcast page only.';

update public.sponsors_catalog
set sponsor_scope = 'app'
where sponsor_scope is null or trim(sponsor_scope) = '';

-- ---------------------------------------------------------------------------
-- 2) Seeded podcast sponsors (idempotent by slug)
-- ---------------------------------------------------------------------------
insert into public.sponsors_catalog (
  slug, name, sponsor_type, sponsor_scope, website_url,
  short_description, tagline, featured, display_order, verified, enrichment_status, is_active
)
values
  ('rope-solutions', 'Rope Solutions', 'Podcast sponsor', 'podcast', '',
   'Podcast sponsor', 'Supporting The Outreach Project podcast.', true, 10, true, 'manual', true),
  ('game-day-mens-health', 'Game Day Men''s Health', 'Podcast sponsor', 'podcast', '',
   'Podcast sponsor', 'Supporting The Outreach Project podcast.', true, 20, true, 'manual', true),
  ('wrecking-realty-group', 'Wrecking Realty Group', 'Podcast sponsor', 'podcast', '',
   'Podcast sponsor', 'Supporting The Outreach Project podcast.', true, 30, true, 'manual', true),
  ('iron-soldiers-coffee-company', 'Iron Soldiers Coffee Company', 'Podcast sponsor', 'podcast', '',
   'Podcast sponsor', 'Supporting The Outreach Project podcast.', true, 40, true, 'manual', true),
  ('eduardo-pico-designs', 'Eduardo Pico Designs', 'Podcast sponsor', 'podcast', '',
   'Podcast sponsor', 'Supporting The Outreach Project podcast.', true, 50, true, 'manual', true),
  ('wars-end-merch', 'War''s End', 'Podcast sponsor', 'podcast', '',
   'Podcast sponsor', 'Supporting The Outreach Project podcast.', true, 60, true, 'manual', true),
  ('brain-treatment-center', 'Brain Treatment Center', 'Podcast sponsor', 'podcast', '',
   'Podcast sponsor', 'Supporting The Outreach Project podcast.', true, 70, true, 'manual', true)
on conflict (slug) do update set
  name = excluded.name,
  sponsor_scope = excluded.sponsor_scope,
  sponsor_type = excluded.sponsor_type,
  short_description = excluded.short_description,
  tagline = excluded.tagline,
  featured = excluded.featured,
  display_order = excluded.display_order,
  verified = excluded.verified,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3) podcast_upcoming_guests — admin-managed, published-only on public site
-- ---------------------------------------------------------------------------
create table if not exists public.podcast_upcoming_guests (
  id uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  name text not null,
  organization text not null default '',
  role_title text not null default '',
  short_description text not null default '',
  profile_image_url text not null default '',
  expected_episode_date date,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint podcast_upcoming_guests_status_chk check (status in ('draft', 'published'))
);

create index if not exists podcast_upcoming_guests_public_list_idx
  on public.podcast_upcoming_guests (status, sort_order ASC, created_at DESC);

comment on table public.podcast_upcoming_guests is
  'Editorial upcoming guests for the podcast landing page; only status=published is public.';

alter table public.podcast_upcoming_guests enable row level security;

-- Service role bypasses RLS; optional future anon policies can be added here.

-- ---------------------------------------------------------------------------
-- 4) community_posts.is_demo_seed — hide on production public API
-- ---------------------------------------------------------------------------
alter table public.community_posts
  add column if not exists is_demo_seed boolean not null default false;

comment on column public.community_posts.is_demo_seed is
  'QA/demo seeded posts; public API omits these on production deployments.';

commit;
