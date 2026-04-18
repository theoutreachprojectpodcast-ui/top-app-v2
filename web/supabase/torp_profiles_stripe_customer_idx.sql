-- Speed webhook + portal lookups by Stripe customer id (optional migration).
create index if not exists torp_profiles_stripe_customer_id_idx on public.torp_profiles (stripe_customer_id)
where stripe_customer_id is not null and length(trim(stripe_customer_id)) > 0;
