-- Billing provenance for torp_profiles (Stripe vs manual/onboarding).

alter table public.torp_profiles
  add column if not exists membership_source text not null default 'manual';

comment on column public.torp_profiles.membership_source is 'manual | stripe | onboarding — set by app/webhook; not a billing authority.';
