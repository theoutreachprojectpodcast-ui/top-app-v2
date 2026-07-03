-- Add `access` tier for App Access ($5.99/year) — required for Capacitor mobile app.
-- Run in Supabase SQL editor (production + QA) before enabling STRIPE_PRICE_ACCESS_YEARLY.

alter table public.top_profiles
  drop constraint if exists top_profiles_membership_tier_chk;

alter table public.top_profiles
  add constraint top_profiles_membership_tier_chk check (
    membership_tier in ('free', 'access', 'support', 'member', 'sponsor')
  );

-- QA table (if used)
alter table public.top_qa_profiles
  drop constraint if exists top_qa_profiles_membership_tier_chk;

alter table public.top_qa_profiles
  add constraint top_qa_profiles_membership_tier_chk check (
    membership_tier in ('free', 'access', 'support', 'member', 'sponsor')
  );
