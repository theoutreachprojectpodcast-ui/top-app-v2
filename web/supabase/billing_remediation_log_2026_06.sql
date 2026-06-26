-- Billing remediation log for Support mischarge ($99/yr vs $0.99/yr) — admin/service role only.
-- Safe to run multiple times.

create table if not exists public.billing_remediation_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workos_user_id text null,
  recipient_email text null,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  stripe_charge_id text null,
  stripe_payment_intent_id text null,
  incorrect_price_id text null,
  amount_charged_cents integer null,
  refund_amount_cents integer null,
  refund_status text not null default 'pending',
  refund_id text null,
  refund_error text null,
  email_status text null,
  notes text null,
  created_by text null
);

create index if not exists billing_remediation_log_created_at_idx
  on public.billing_remediation_log (created_at desc);
create index if not exists billing_remediation_log_subscription_idx
  on public.billing_remediation_log (stripe_subscription_id);
create index if not exists billing_remediation_log_email_idx
  on public.billing_remediation_log (recipient_email);

alter table public.billing_remediation_log enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'billing_remediation_log'
      and pol.polname = 'billing_remediation_log_no_client_access'
  ) then
    create policy billing_remediation_log_no_client_access on public.billing_remediation_log
      as permissive
      for all
      to public
      using (false)
      with check (false);
  end if;
end
$$;
