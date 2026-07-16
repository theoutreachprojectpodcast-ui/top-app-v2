-- Support → Pro complimentary migration (non-destructive).
-- Preserves Support history; grants Pro through original paid period end.
-- Safe to re-run.

begin;

-- Profile columns for migrated Pro entitlement
alter table public.top_profiles
  add column if not exists migrated_to_pro_at timestamptz,
  add column if not exists migrated_to_pro_until timestamptz,
  add column if not exists migration_version text,
  add column if not exists support_membership_status text,
  add column if not exists migration_reason text;

comment on column public.top_profiles.migrated_to_pro_at is
  'When Support→Pro complimentary migration was applied.';
comment on column public.top_profiles.migrated_to_pro_until is
  'Complimentary Pro access ends (original Support paid period end).';
comment on column public.top_profiles.support_membership_status is
  'Historical Support status after migration, e.g. migrated_to_pro.';
comment on column public.top_profiles.migration_version is
  'Migration batch id, e.g. support_to_pro_2026_v1.';

create index if not exists top_profiles_migrated_to_pro_until_idx
  on public.top_profiles (migrated_to_pro_until)
  where migrated_to_pro_until is not null;

create index if not exists top_profiles_support_membership_status_idx
  on public.top_profiles (support_membership_status)
  where support_membership_status is not null;

create table if not exists public.support_to_pro_migration_records (
  id uuid primary key default gen_random_uuid(),
  migration_version text not null,
  workos_user_id text not null,
  email text,
  display_name text,
  status text not null default 'pending',
  -- pending | eligible | migrated | skipped_paid_pro | skipped_expired | exception | email_failed
  eligibility text,
  exception_reason text,
  original_support_period_start timestamptz,
  original_support_period_end timestamptz,
  period_start_source text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_status text,
  stripe_cancel_at_period_end boolean,
  stripe_cancel_applied boolean not null default false,
  previous_membership_tier text,
  previous_membership_status text,
  previous_membership_source text,
  dry_run boolean not null default false,
  migrated_at timestamptz,
  email_status text,
  email_idempotency_key text,
  email_provider_id text,
  email_sent_at timestamptz,
  email_error text,
  email_retry_count integer not null default 0,
  audit jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (migration_version, workos_user_id)
);

create index if not exists support_to_pro_migration_records_status_idx
  on public.support_to_pro_migration_records (migration_version, status);

create index if not exists support_to_pro_migration_records_email_idx
  on public.support_to_pro_migration_records (email_status, migration_version);

create table if not exists public.support_to_pro_migration_emails (
  id uuid primary key default gen_random_uuid(),
  migration_version text not null,
  workos_user_id text not null,
  migration_record_id uuid references public.support_to_pro_migration_records(id) on delete set null,
  email_address text not null,
  template_version text not null default 'support_to_pro_v1',
  idempotency_key text not null unique,
  status text not null default 'pending',
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  bounce_status text,
  failure_reason text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_to_pro_migration_emails_user_idx
  on public.support_to_pro_migration_emails (migration_version, workos_user_id);

alter table public.support_to_pro_migration_records enable row level security;
alter table public.support_to_pro_migration_emails enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'support_to_pro_migration_records'
      and policyname = 'support_to_pro_migration_records_block_clients'
  ) then
    create policy support_to_pro_migration_records_block_clients
      on public.support_to_pro_migration_records
      as restrictive for all to anon, authenticated using (false) with check (false);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'support_to_pro_migration_emails'
      and policyname = 'support_to_pro_migration_emails_block_clients'
  ) then
    create policy support_to_pro_migration_emails_block_clients
      on public.support_to_pro_migration_emails
      as restrictive for all to anon, authenticated using (false) with check (false);
  end if;
end $$;

commit;
