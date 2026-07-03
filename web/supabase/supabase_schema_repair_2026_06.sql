-- =============================================================================
-- TOP — Supabase schema repair (additive, idempotent)
-- =============================================================================
-- Run in Supabase SQL Editor when:
--   • Profile PATCH returns column errors (especially on QA / top_qa_profiles)
--   • community_posts insert fails on author_profile_id FK (QA)
--   • safe_alignment_extension index failed on missing enrichment columns
--   • verify:supabase reports missing columns/tables
--
-- Safe to re-run. No DROP TABLE / TRUNCATE.
-- After applying: pnpm --dir web run verify:supabase (requires SUPABASE_SERVICE_ROLE_KEY)
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) top_profiles — ensure all columns the Next.js app reads/writes exist
-- ---------------------------------------------------------------------------

alter table if exists public.top_profiles
  add column if not exists membership_source text not null default 'manual',
  add column if not exists platform_role text not null default 'user',
  add column if not exists account_intent text,
  add column if not exists onboarding_status text not null default 'not_started',
  add column if not exists renewal_date timestamptz,
  add column if not exists billing_status text,
  add column if not exists sponsor_tier text,
  add column if not exists payment_method_summary jsonb not null default '{}'::jsonb,
  add column if not exists phone_number text,
  add column if not exists postal_code text,
  add column if not exists preferred_contact_method text,
  add column if not exists notification_preferences jsonb not null default '[]'::jsonb,
  add column if not exists identity_segment text,
  add column if not exists job_title text,
  add column if not exists reason_for_joining text,
  add column if not exists support_needs text,
  add column if not exists communities text,
  add column if not exists contribution_interests jsonb not null default '{}'::jsonb,
  add column if not exists preferred_contribution_contact text,
  add column if not exists onboarding_skipped boolean not null default false,
  add column if not exists profile_completeness_percentage smallint,
  add column if not exists profile_completeness_missing_fields jsonb not null default '[]'::jsonb,
  add column if not exists profile_last_updated_at timestamptz,
  add column if not exists account_setup_completed_at timestamptz,
  add column if not exists last_login_at timestamptz,
  add column if not exists user_type text not null default 'member',
  add column if not exists user_status text not null default 'active',
  add column if not exists invited_by text,
  add column if not exists permissions jsonb not null default '[]'::jsonb,
  add column if not exists admin_access_enabled boolean not null default false,
  add column if not exists admin_access_granted_by text,
  add column if not exists admin_access_granted_at timestamptz;

-- membership_status: allow trialing (Stripe) on existing check if present
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'top_profiles_membership_status_chk'
      and conrelid = 'public.top_profiles'::regclass
  ) then
    alter table public.top_profiles drop constraint top_profiles_membership_status_chk;
  end if;
  alter table public.top_profiles
    add constraint top_profiles_membership_status_chk check (
      membership_status in ('none', 'pending', 'active', 'past_due', 'canceled', 'incomplete', 'trialing')
    );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2) top_qa_profiles — full parity when QA table exists
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.top_qa_profiles') is null then
    raise notice 'schema_repair: top_qa_profiles not present — skipped QA parity block';
    return;
  end if;

  alter table public.top_qa_profiles
    add column if not exists renewal_date timestamptz,
    add column if not exists billing_status text,
    add column if not exists sponsor_tier text,
    add column if not exists payment_method_summary jsonb not null default '{}'::jsonb,
    add column if not exists phone_number text,
    add column if not exists postal_code text,
    add column if not exists preferred_contact_method text,
    add column if not exists notification_preferences jsonb not null default '[]'::jsonb,
    add column if not exists identity_segment text,
    add column if not exists job_title text,
    add column if not exists reason_for_joining text,
    add column if not exists support_needs text,
    add column if not exists communities text,
    add column if not exists contribution_interests jsonb not null default '{}'::jsonb,
    add column if not exists preferred_contribution_contact text,
    add column if not exists onboarding_skipped boolean not null default false,
    add column if not exists profile_completeness_percentage smallint,
    add column if not exists profile_completeness_missing_fields jsonb not null default '[]'::jsonb,
    add column if not exists profile_last_updated_at timestamptz,
    add column if not exists account_setup_completed_at timestamptz,
    add column if not exists last_login_at timestamptz,
    add column if not exists user_type text not null default 'member',
    add column if not exists user_status text not null default 'active',
    add column if not exists invited_by text,
    add column if not exists permissions jsonb not null default '[]'::jsonb,
    add column if not exists admin_access_enabled boolean not null default false,
    add column if not exists admin_access_granted_by text,
    add column if not exists admin_access_granted_at timestamptz;

  if exists (
    select 1 from pg_constraint
    where conname = 'top_qa_profiles_membership_status_chk'
      and conrelid = 'public.top_qa_profiles'::regclass
  ) then
    alter table public.top_qa_profiles drop constraint top_qa_profiles_membership_status_chk;
  end if;
  alter table public.top_qa_profiles
    add constraint top_qa_profiles_membership_status_chk check (
      membership_status in ('none', 'pending', 'active', 'past_due', 'canceled', 'incomplete', 'trialing')
    );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 3) QA: mirror top_qa_profiles → top_profiles (same UUID) for community FK
--    community_posts.author_profile_id references top_profiles(id)
-- ---------------------------------------------------------------------------

create or replace function public._sync_top_qa_profile_shadow_to_top()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass('public.top_profiles') is null then
    return new;
  end if;

  insert into public.top_profiles (
    id,
    workos_user_id,
    email,
    display_name,
    first_name,
    last_name,
    profile_photo_url,
    bio,
    membership_tier,
    membership_status,
    membership_source,
    stripe_customer_id,
    stripe_subscription_id,
    onboarding_completed,
    banner,
    theme,
    metadata,
    platform_role,
    account_intent,
    onboarding_status,
    renewal_date,
    billing_status,
    sponsor_tier,
    payment_method_summary,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.workos_user_id,
    new.email,
    new.display_name,
    new.first_name,
    new.last_name,
    new.profile_photo_url,
    new.bio,
    new.membership_tier,
    new.membership_status,
    new.membership_source,
    new.stripe_customer_id,
    new.stripe_subscription_id,
    new.onboarding_completed,
    new.banner,
    new.theme,
    coalesce(new.metadata, '{}'::jsonb),
    coalesce(new.platform_role, 'user'),
    new.account_intent,
    coalesce(new.onboarding_status, 'not_started'),
    new.renewal_date,
    new.billing_status,
    new.sponsor_tier,
    coalesce(new.payment_method_summary, '{}'::jsonb),
    coalesce(new.created_at, now()),
    coalesce(new.updated_at, now())
  )
  on conflict (id) do update set
    workos_user_id = excluded.workos_user_id,
    email = excluded.email,
    display_name = excluded.display_name,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    profile_photo_url = excluded.profile_photo_url,
    bio = excluded.bio,
    membership_tier = excluded.membership_tier,
    membership_status = excluded.membership_status,
    membership_source = excluded.membership_source,
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    onboarding_completed = excluded.onboarding_completed,
    platform_role = excluded.platform_role,
    account_intent = excluded.account_intent,
    onboarding_status = excluded.onboarding_status,
    renewal_date = excluded.renewal_date,
    billing_status = excluded.billing_status,
    sponsor_tier = excluded.sponsor_tier,
    payment_method_summary = excluded.payment_method_summary,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.top_qa_profiles') is null then
    return;
  end if;

  drop trigger if exists top_qa_profiles_shadow_top_trg on public.top_qa_profiles;
  create trigger top_qa_profiles_shadow_top_trg
    after insert or update on public.top_qa_profiles
    for each row
    execute function public._sync_top_qa_profile_shadow_to_top();

  -- Backfill existing QA rows
  insert into public.top_profiles (
    id, workos_user_id, email, display_name, first_name, last_name,
    membership_tier, membership_status, membership_source, platform_role,
    onboarding_status, onboarding_completed, created_at, updated_at
  )
  select
    q.id, q.workos_user_id, q.email, q.display_name, q.first_name, q.last_name,
    q.membership_tier, q.membership_status, q.membership_source, q.platform_role,
    q.onboarding_status, q.onboarding_completed, q.created_at, q.updated_at
  from public.top_qa_profiles q
  where not exists (select 1 from public.top_profiles t where t.id = q.id)
  on conflict (id) do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- 4) nonprofit_directory_enrichment — columns used by safe_alignment index
-- ---------------------------------------------------------------------------

alter table if exists public.nonprofit_directory_enrichment
  add column if not exists verified boolean not null default true,
  add column if not exists verification_notes text,
  add column if not exists naming_review_required boolean not null default false,
  add column if not exists last_verified_at timestamptz;

do $$
begin
  if to_regclass('public.nonprofit_directory_enrichment') is null then
    return;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nonprofit_directory_enrichment'
      and column_name = 'verified'
  ) then
    execute $idx$
      create index if not exists nonprofit_directory_enrichment_verified_idx
      on public.nonprofit_directory_enrichment (verified, naming_review_required, last_verified_at desc)
    $idx$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5) sponsors_catalog — is_active for alignment + public read policy
-- ---------------------------------------------------------------------------

alter table if exists public.sponsors_catalog
  add column if not exists is_active boolean not null default true;

alter table if exists public.sponsor_applications
  add column if not exists sponsor_slug text,
  add column if not exists sponsor_catalog_id uuid;

-- ---------------------------------------------------------------------------
-- 6) Schema health diagnostic (run: select * from public._top_schema_health())
-- ---------------------------------------------------------------------------

create or replace function public._top_schema_health()
returns table(check_id text, status text, detail text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  tbl text;
  col text;
  required_tables text[] := array[
    'top_profiles', 'sponsors_catalog', 'trusted_resources', 'community_posts',
    'admin_settings', 'billing_records', 'page_content_blocks', 'page_images'
  ];
  profile_cols text[] := array[
    'billing_status', 'last_login_at', 'phone_number', 'identity_segment', 'user_type'
  ];
begin
  foreach tbl in array required_tables loop
    if to_regclass('public.' || tbl) is null then
      return query select tbl, 'MISSING_TABLE', 'Run web/supabase/README_SETUP.md migration order';
    else
      return query select tbl, 'OK', 'table exists';
    end if;
  end loop;

  if to_regclass('public.top_profiles') is not null then
    foreach col in array profile_cols loop
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'top_profiles' and column_name = col
      ) then
        return query select 'top_profiles.' || col, 'MISSING_COLUMN', 'Re-run this repair file';
      end if;
    end loop;
  end if;

  if to_regclass('public.top_qa_profiles') is not null then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'top_qa_profiles' and column_name = 'billing_status'
    ) then
      return query select 'top_qa_profiles.billing_status', 'MISSING_COLUMN', 'QA parity block failed — re-run repair';
    else
      return query select 'top_qa_profiles', 'OK', 'QA profile table present with billing columns';
    end if;
  end if;

  if to_regclass('public.nonprofits_search_app_v1') is null then
    return query select 'nonprofits_search_app_v1', 'WARN', 'Directory search view/table missing — empty directory until seeded';
  else
    return query select 'nonprofits_search_app_v1', 'OK', 'directory source present';
  end if;

  return;
end;
$$;

commit;

-- Quick check (optional):
-- select * from public._top_schema_health() order by 1;
