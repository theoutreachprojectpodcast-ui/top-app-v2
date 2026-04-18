-- Billing provenance for torp_profiles (Stripe vs manual/onboarding).
-- Non-destructive: only ADD COLUMN IF NOT EXISTS + COMMENT (no DROP/TRUNCATE).
--
-- Prerequisite: table public.torp_profiles must exist. If you see
--   relation "public.torp_profiles" does not exist
-- run web/supabase/torp_v03_profiles.sql first (creates the table, RLS, profile-photos bucket).
-- New installs: torp_v03_profiles.sql already includes membership_source; this file is still safe (IF NOT EXISTS).

alter table public.torp_profiles
  add column if not exists membership_source text not null default 'manual';

comment on column public.torp_profiles.membership_source is 'manual | stripe | onboarding — set by app/webhook; not a billing authority.';
