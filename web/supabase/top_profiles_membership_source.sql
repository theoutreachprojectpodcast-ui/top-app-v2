-- Billing provenance for top_profiles (Stripe vs manual/onboarding).
-- Migration #3 in docs/production-supabase-migration-order.md
-- Non-destructive: only ADD COLUMN IF NOT EXISTS + COMMENT (no DROP/TRUNCATE).
--
-- HOW TO RUN (required):
--   Supabase Dashboard → SQL Editor → New query → paste this entire file → Run.
--   Do NOT paste into PowerShell, cmd, or bash — you will get parser errors on `do $$`.
--
-- Prerequisite: public.top_profiles must exist.
--   ERROR: relation "public.top_profiles" does not exist
--   → Run web/supabase/top_v03_profiles.sql (#1) first.
--
-- If you already ran top_v03_profiles.sql (#1), membership_source is already on the table.
-- This file is still safe (IF NOT EXISTS) and should return success with no error.

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'top_profiles'
  ) then
    raise exception
      'top_profiles missing: run web/supabase/top_v03_profiles.sql (#1) before top_profiles_membership_source.sql (#3)';
  end if;
end $$;

alter table public.top_profiles
  add column if not exists membership_source text not null default 'manual';

comment on column public.top_profiles.membership_source is 'manual | stripe | onboarding — set by app/webhook; not a billing authority.';
