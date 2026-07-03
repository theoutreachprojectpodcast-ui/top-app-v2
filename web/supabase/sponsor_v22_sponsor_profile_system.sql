-- Sponsor profile system: extended fields, publish workflow, click tracking, research drafts.
-- Idempotent. Run after sponsor_v21_mission_partner_presentations.sql.

begin;

alter table if exists public.sponsors_catalog
  add column if not exists cta_label text;

alter table if exists public.sponsors_catalog
  add column if not exists cta_url text;

alter table if exists public.sponsors_catalog
  add column if not exists promo_code text;

alter table if exists public.sponsors_catalog
  add column if not exists inquiry_url text;

alter table if exists public.sponsors_catalog
  add column if not exists publish_status text not null default 'published';

alter table if exists public.sponsors_catalog
  add column if not exists published_at timestamptz;

alter table if exists public.sponsors_catalog
  add column if not exists featured_items jsonb not null default '[]'::jsonb;

alter table if exists public.sponsor_enrichment
  add column if not exists research_draft jsonb;

comment on column public.sponsors_catalog.cta_url is 'Primary CTA destination; falls back to website_url in the app when empty.';
comment on column public.sponsors_catalog.publish_status is 'draft | published | archived';
comment on column public.sponsors_catalog.featured_items is 'Array of {title, description, url} objects for profile highlights.';
comment on column public.sponsor_enrichment.research_draft is 'Admin website review output pending approval (never auto-published).';

do $$
begin
  alter table public.sponsors_catalog
    add constraint sponsors_catalog_publish_status_chk check (
      publish_status in ('draft', 'published', 'archived')
    );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.sponsor_click_events (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid references public.sponsors_catalog (id) on delete set null,
  sponsor_slug text not null,
  sponsor_name text not null default '',
  profile_id uuid,
  workos_user_id text,
  page_source text not null default 'main_sponsor_page',
  cta_type text not null default 'website',
  target_url text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists sponsor_click_events_sponsor_created_idx
  on public.sponsor_click_events (sponsor_slug, created_at desc);

create index if not exists sponsor_click_events_created_idx
  on public.sponsor_click_events (created_at desc);

comment on table public.sponsor_click_events is 'Outbound sponsor CTA clicks from public profile and hub cards.';

alter table public.sponsor_click_events enable row level security;

commit;
