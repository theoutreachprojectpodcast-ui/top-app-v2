-- tOP v0.6 — Onboarding questionnaire + profile completeness columns.
-- Idempotent; safe for local / QA / production.

begin;

alter table if exists public.torp_profiles
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
  add column if not exists account_setup_completed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'torp_profiles_preferred_contact_method_chk'
      and conrelid = 'public.torp_profiles'::regclass
  ) then
    alter table public.torp_profiles
      add constraint torp_profiles_preferred_contact_method_chk check (
        preferred_contact_method is null
        or preferred_contact_method in ('email', 'phone', 'sms', 'in_app')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'torp_profiles_identity_segment_chk'
      and conrelid = 'public.torp_profiles'::regclass
  ) then
    alter table public.torp_profiles
      add constraint torp_profiles_identity_segment_chk check (
        identity_segment is null
        or identity_segment in (
          'veteran',
          'first_responder',
          'family_member',
          'supporter',
          'organization_representative',
          'sponsor',
          'resource_partner'
        )
      );
  end if;
end $$;

create index if not exists torp_profiles_identity_segment_idx on public.torp_profiles (identity_segment);
create index if not exists torp_profiles_onboarding_skipped_idx on public.torp_profiles (onboarding_skipped);

-- QA mirror table when present
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'top_qa_profiles' and c.relkind = 'r'
  ) then
    alter table public.top_qa_profiles
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
      add column if not exists account_setup_completed_at timestamptz;
  end if;
end
$$;

commit;
