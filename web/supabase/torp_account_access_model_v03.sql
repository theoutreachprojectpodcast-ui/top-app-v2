-- tORP v0.3 — Account intent, platform role, and onboarding lifecycle (additive).
-- Run after web/supabase/torp_v03_profiles.sql (table must exist).
-- Safe to run multiple times (IF NOT EXISTS + named constraint guards).

alter table public.torp_profiles
  add column if not exists platform_role text not null default 'user',
  add column if not exists account_intent text,
  add column if not exists onboarding_status text not null default 'not_started';

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public' and t.relname = 'torp_profiles' and c.conname = 'torp_profiles_platform_role_chk'
  ) then
    alter table public.torp_profiles
      add constraint torp_profiles_platform_role_chk check (
        platform_role in ('user', 'support', 'member', 'sponsor', 'moderator', 'admin')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public' and t.relname = 'torp_profiles' and c.conname = 'torp_profiles_account_intent_chk'
  ) then
    alter table public.torp_profiles
      add constraint torp_profiles_account_intent_chk check (
        account_intent is null
        or account_intent in (
          'free_user',
          'support_user',
          'member_user',
          'sponsor_user',
          'admin_user',
          'moderator_user'
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public' and t.relname = 'torp_profiles' and c.conname = 'torp_profiles_onboarding_status_chk'
  ) then
    alter table public.torp_profiles
      add constraint torp_profiles_onboarding_status_chk check (
        onboarding_status in ('not_started', 'in_progress', 'completed', 'needs_review')
      );
  end if;
end
$$;

comment on column public.torp_profiles.platform_role is 'Permission layer: user | support | member | sponsor | moderator | admin (admin/moderator via assignment only).';
comment on column public.torp_profiles.account_intent is 'Signup branch: free_user | support_user | member_user | sponsor_user; admin_user/moderator_user set server-side only.';
comment on column public.torp_profiles.onboarding_status is 'Wizard state: not_started | in_progress | completed | needs_review (e.g. sponsor application).';
