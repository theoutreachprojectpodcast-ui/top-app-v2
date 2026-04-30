-- tOP v0.5 admin CMS all-in-one (safe, additive)
-- Run after existing v0.5 repair SQL files.

begin;

-- ---------------------------------------------------------------------------
-- 1) Shared admin settings (contact routing, CMS toggles)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null default '{}'::jsonb,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_settings_key_idx
  on public.admin_settings (setting_key);

-- ---------------------------------------------------------------------------
-- 2) Site page/section image manager
-- ---------------------------------------------------------------------------
create table if not exists public.page_images (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  section_key text not null default 'default',
  image_url text not null default '',
  alt_text text not null default '',
  image_kind text not null default 'hero'
    check (image_kind in ('background', 'hero', 'section', 'card_fallback', 'logo', 'other')),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_key, section_key, image_kind)
);

create index if not exists page_images_public_idx
  on public.page_images (page_key, section_key, image_kind, is_active, display_order);

-- ---------------------------------------------------------------------------
-- 3) Contact submissions persistence
-- ---------------------------------------------------------------------------
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null default 'contact',
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'resolved', 'archived')),
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  subject text not null default '',
  message text not null default '',
  routing_key text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists form_submissions_list_idx
  on public.form_submissions (form_type, status, created_at desc);

-- ---------------------------------------------------------------------------
-- 4) Invoice/billing action logs for admin email workflow
-- ---------------------------------------------------------------------------
create table if not exists public.billing_records (
  id uuid primary key default gen_random_uuid(),
  workos_user_id text not null default '',
  recipient_email text not null default '',
  recipient_name text not null default '',
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  reason text not null default '',
  payment_url text not null default '',
  notes text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'sent', 'failed', 'paid', 'voided')),
  provider text not null default '',
  provider_message_id text,
  provider_error text,
  sent_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_records_user_status_idx
  on public.billing_records (workos_user_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- 5) Sponsors CMS + workflow fields
-- ---------------------------------------------------------------------------
alter table public.sponsors_catalog
  add column if not exists sponsor_status text not null default 'active',
  add column if not exists mission_partner boolean not null default false,
  add column if not exists podcast_sponsor boolean not null default false,
  add column if not exists supporting_sponsor boolean not null default false,
  add column if not exists payment_status text not null default 'unknown',
  add column if not exists onboarding_status text not null default 'not_started',
  add column if not exists admin_notes text;

alter table public.sponsor_applications
  add column if not exists invoice_amount_cents integer,
  add column if not exists invoice_reason text,
  add column if not exists invoice_url text,
  add column if not exists invoice_sent_at timestamptz,
  add column if not exists payment_status text not null default 'submitted',
  add column if not exists onboarding_status text not null default 'submitted';

-- ---------------------------------------------------------------------------
-- 6) Trusted resources + community + podcast workflow fields
-- ---------------------------------------------------------------------------
alter table public.trusted_resources
  add column if not exists status text not null default 'active',
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists admin_notes text;

alter table public.community_posts
  add column if not exists featured boolean not null default false;

alter table public.podcast_episodes
  add column if not exists admin_include boolean not null default false,
  add column if not exists admin_exclude boolean not null default false,
  add column if not exists title_override text,
  add column if not exists description_override text,
  add column if not exists thumbnail_override_url text;

alter table public.podcast_guest_applications
  add column if not exists admin_notes text,
  add column if not exists converted_upcoming_guest_id uuid;

-- ---------------------------------------------------------------------------
-- 7) Minimal seed/defaults for new settings keys
-- ---------------------------------------------------------------------------
insert into public.admin_settings (setting_key, setting_value)
values
  ('contact.form', jsonb_build_object(
    'recipientEmail', '',
    'ccEmail', '',
    'bccEmail', '',
    'successMessage', 'Thanks for reaching out. We will get back to you shortly.',
    'routing', jsonb_build_object('default', '')
  ))
on conflict (setting_key) do nothing;

commit;
