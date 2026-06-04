-- Billing provenance for torp_profiles (Stripe vs manual/onboarding).
-- Migration #3 in docs/production-supabase-migration-order.md
-- Non-destructive: only ADD COLUMN IF NOT EXISTS + COMMENT (no DROP/TRUNCATE).
--
-- Prerequisite: public.torp_profiles must exist.
--   ERROR: relation "public.torp_profiles" does not exist
--   → Run web/supabase/torp_v03_profiles.sql (#1) first.
--
-- If you already ran torp_v03_profiles.sql (#1), membership_source is already on the table.
-- This file is still safe (IF NOT EXISTS) and should return success with no error.

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'torp_profiles'
  ) then
    raise exception
      'torp_profiles missing: run web/supabase/torp_v03_profiles.sql (#1) before torp_profiles_membership_source.sql (#3)';
  end if;
end $$;

alter table public.torp_profiles
  add column if not exists membership_source text not null default 'manual';

comment on column public.torp_profiles.membership_source is 'manual | stripe | onboarding — set by app/webhook; not a billing authority.';
