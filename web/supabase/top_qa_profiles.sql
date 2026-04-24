-- TOP v0.4 — QA-only profile table for WorkOS users.
-- Keeps QA sign-ups/sign-ins isolated from production profile rows.
-- Safe to run multiple times.

create table if not exists public.top_qa_profiles (
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
  platform_role text not null default 'user',
  account_intent text,
  onboarding_status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint top_qa_profiles_membership_tier_chk check (
    membership_tier in ('free', 'support', 'member', 'sponsor')
  ),
  constraint top_qa_profiles_membership_status_chk check (
    membership_status in ('none', 'pending', 'active', 'past_due', 'canceled', 'incomplete')
  )
);

create index if not exists top_qa_profiles_workos_user_id_idx on public.top_qa_profiles (workos_user_id);
create index if not exists top_qa_profiles_stripe_customer_id_idx on public.top_qa_profiles (stripe_customer_id);
create index if not exists top_qa_profiles_platform_role_idx on public.top_qa_profiles (platform_role);

alter table public.top_qa_profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'top_qa_profiles'
      and pol.polname = 'top_qa_profiles_block_anon'
  ) then
    create policy top_qa_profiles_block_anon
      on public.top_qa_profiles
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
      and cls.relname = 'top_qa_profiles'
      and pol.polname = 'top_qa_profiles_block_authenticated'
  ) then
    create policy top_qa_profiles_block_authenticated
      on public.top_qa_profiles
      for all
      to authenticated
      using (false)
      with check (false);
  end if;
end
$$;

comment on table public.top_qa_profiles is 'QA-only WorkOS-linked app profiles (isolated from production profile rows).';
