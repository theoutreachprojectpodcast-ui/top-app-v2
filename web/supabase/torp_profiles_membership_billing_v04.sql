-- Membership & billing fields on torp_profiles (and QA mirror when applied separately).
-- Safe to run multiple times.

alter table public.torp_profiles
  add column if not exists renewal_date timestamptz,
  add column if not exists billing_status text,
  add column if not exists sponsor_tier text,
  add column if not exists payment_method_summary jsonb not null default '{}'::jsonb;

comment on column public.torp_profiles.renewal_date is 'Next subscription renewal from Stripe (current_period_end).';
comment on column public.torp_profiles.billing_status is 'Mirrors Stripe subscription billing state; membership_status remains entitlement source.';
comment on column public.torp_profiles.sponsor_tier is 'Active sponsor package id from sponsor opportunities (mission/podcast/monthly).';
comment on column public.torp_profiles.payment_method_summary is 'Masked default payment method from Stripe; never store PAN.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'torp_profiles_billing_status_chk'
  ) then
    alter table public.torp_profiles
      add constraint torp_profiles_billing_status_chk check (
        billing_status is null
        or billing_status in ('none', 'pending', 'active', 'past_due', 'canceled', 'incomplete', 'trialing')
      );
  end if;
end $$;
