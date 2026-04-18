-- tORP v0.3 — Application profiles for WorkOS-authenticated users.
-- Access pattern: Next.js Route Handlers with Supabase service role (RLS blocks anon/authenticated JWT).
-- Safe to run multiple times.
--
-- Non-destructive by design (for Supabase SQL editor):
--   No DROP POLICY / DROP TABLE. Policies are created only if missing (see pg_policies checks).
--   Bucket row is inserted only if missing — we do not overwrite existing bucket settings.
-- If you ever need to change a policy definition in place, drop the policy manually in the
-- dashboard (or a one-off script), then re-run this file.

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
  membership_source text not null default 'manual',
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

-- Idempotent RLS: create only when missing (avoids DROP POLICY).
-- Uses pg_catalog (works across Postgres versions Supabase ships).
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'torp_profiles'
      and pol.polname = 'torp_profiles_block_anon'
  ) then
    create policy torp_profiles_block_anon
      on public.torp_profiles
      for all
      to anon
      using (false)
      with check (false);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'torp_profiles'
      and pol.polname = 'torp_profiles_block_authenticated'
  ) then
    create policy torp_profiles_block_authenticated
      on public.torp_profiles
      for all
      to authenticated
      using (false)
      with check (false);
  end if;
end
$$;

comment on table public.torp_profiles is 'WorkOS-linked app profiles; use service role from trusted server routes only.';
comment on column public.torp_profiles.membership_source is 'manual | stripe | onboarding — set by app/webhook; not a billing authority.';

-- Storage bucket: insert only if absent (does not overwrite your dashboard tweaks).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
where not exists (select 1 from storage.buckets b where b.id = 'profile-photos');

-- Public read for profile avatars (create only when missing).
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'storage'
      and cls.relname = 'objects'
      and pol.polname = 'profile_photos_public_read'
  ) then
    create policy profile_photos_public_read
      on storage.objects
      for select
      to public
      using (bucket_id = 'profile-photos');
  end if;
end
$$;
