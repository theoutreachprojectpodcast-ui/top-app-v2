-- tORP v0.3 — Application profiles for WorkOS-authenticated users.
-- Access pattern: Next.js Route Handlers with Supabase service role (RLS blocks anon/authenticated JWT).
-- Safe to run multiple times.

create table if not exists public.torp_profiles (
  id uuid primary key default gen_random_uuid(),
  workos_user_id text not null unique,
  email text,
  display_name text,
  first_name text,
  last_name text,
  profile_photo_url text,
  bio text,
  membership_tier text not null default 'free',
  membership_status text not null default 'none',
  stripe_customer_id text,
  stripe_subscription_id text,
  onboarding_completed boolean not null default false,
  banner text,
  theme text default 'clean',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint torp_profiles_membership_tier_chk check (
    membership_tier in ('free', 'support', 'member', 'sponsor')
  ),
  constraint torp_profiles_membership_status_chk check (
    membership_status in ('none', 'pending', 'active', 'past_due', 'canceled', 'incomplete')
  )
);

create index if not exists torp_profiles_workos_user_id_idx on public.torp_profiles (workos_user_id);

alter table public.torp_profiles enable row level security;

drop policy if exists torp_profiles_block_anon on public.torp_profiles;
create policy torp_profiles_block_anon
  on public.torp_profiles
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists torp_profiles_block_authenticated on public.torp_profiles;
create policy torp_profiles_block_authenticated
  on public.torp_profiles
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.torp_profiles is 'WorkOS-linked app profiles; use service role from trusted server routes only.';

-- Storage bucket for profile photos (public read; writes via service role / API).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_photos_public_read on storage.objects;
create policy profile_photos_public_read
  on storage.objects
  for select
  to public
  using (bucket_id = 'profile-photos');
