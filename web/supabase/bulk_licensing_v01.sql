-- Bulk annual licensing (org seat packages) — idempotent.
-- Run in SQL Editor after top_v03_profiles / top_qa_profiles and _top_rls_helpers.

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
create table if not exists public.bulk_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_code text not null,
  primary_admin_user_id text,
  purchaser_name text not null default '',
  purchaser_email text not null default '',
  billing_email text not null default '',
  phone text,
  website text,
  organization_type text,
  purchase_order_ref text,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'past_due', 'suspended', 'canceled', 'expired')),
  business_code_locked boolean not null default false,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bulk_organizations_business_code_unique unique (business_code)
);

create index if not exists bulk_organizations_status_idx
  on public.bulk_organizations (status, created_at desc);
create index if not exists bulk_organizations_admin_idx
  on public.bulk_organizations (primary_admin_user_id);
create index if not exists bulk_organizations_purchaser_email_idx
  on public.bulk_organizations (lower(purchaser_email));

comment on table public.bulk_organizations is
  'B2B bulk license purchasers (UUID id + business_code). Not a WorkOS Organization — WorkOS is IdP-only. business_code is display prefix, not a shared redeem credential.';

-- ---------------------------------------------------------------------------
-- Organization members (admins)
-- ---------------------------------------------------------------------------
create table if not exists public.bulk_organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.bulk_organizations(id) on delete cascade,
  workos_user_id text not null,
  email text,
  role text not null default 'viewer'
    check (role in ('owner', 'billing_admin', 'license_admin', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'revoked')),
  invited_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bulk_organization_members_org_user_unique unique (organization_id, workos_user_id)
);

create index if not exists bulk_organization_members_user_idx
  on public.bulk_organization_members (workos_user_id, status);

-- ---------------------------------------------------------------------------
-- Pending purchases (pre-Checkout)
-- ---------------------------------------------------------------------------
create table if not exists public.bulk_pending_purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.bulk_organizations(id) on delete cascade,
  workos_user_id text not null,
  package_size integer not null check (package_size in (25, 50, 100, 200)),
  stripe_price_id text not null,
  stripe_checkout_session_id text,
  status text not null default 'pending'
    check (status in ('pending', 'checkout_created', 'completed', 'abandoned', 'failed')),
  agreed_auto_renewal boolean not null default false,
  agreed_license_terms boolean not null default false,
  purchase_order_ref text,
  deployment_profile text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bulk_pending_purchases_org_idx
  on public.bulk_pending_purchases (organization_id, created_at desc);
create unique index if not exists bulk_pending_purchases_session_uidx
  on public.bulk_pending_purchases (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.bulk_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.bulk_organizations(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_product_id text,
  stripe_price_id text,
  package_size integer not null check (package_size in (25, 50, 100, 200)),
  subscription_status text not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  latest_invoice_id text,
  pending_purchase_id uuid references public.bulk_pending_purchases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bulk_subscriptions_stripe_sub_unique unique (stripe_subscription_id)
);

create index if not exists bulk_subscriptions_org_idx
  on public.bulk_subscriptions (organization_id, created_at desc);

comment on table public.bulk_subscriptions is
  'Stripe subscription for the org package. Profile.stripe_subscription_id remains individual-only.';
create index if not exists bulk_subscriptions_customer_idx
  on public.bulk_subscriptions (stripe_customer_id);

-- ---------------------------------------------------------------------------
-- License batches (annual terms)
-- ---------------------------------------------------------------------------
create table if not exists public.bulk_license_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.bulk_organizations(id) on delete cascade,
  bulk_subscription_id uuid not null references public.bulk_subscriptions(id) on delete cascade,
  package_size integer not null check (package_size in (25, 50, 100, 200)),
  business_code_snapshot text not null,
  term_start timestamptz not null,
  term_end timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'past_due', 'expired', 'canceled', 'suspended')),
  generated_count integer not null default 0,
  redeemed_count integer not null default 0,
  stripe_invoice_id text,
  activation_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bulk_license_batches_sub_term_unique unique (bulk_subscription_id, term_start)
);

create index if not exists bulk_license_batches_org_idx
  on public.bulk_license_batches (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Individual licenses (seats)
-- ---------------------------------------------------------------------------
create table if not exists public.bulk_individual_licenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.bulk_organizations(id) on delete cascade,
  license_batch_id uuid not null references public.bulk_license_batches(id) on delete cascade,
  seat_number integer not null check (seat_number >= 1),
  display_code text not null,
  secure_token_hash text not null,
  status text not null default 'available'
    check (status in ('available', 'assigned', 'redeemed', 'revoked', 'expired', 'suspended')),
  assigned_email text,
  assigned_user_id text,
  assigned_at timestamptz,
  invitation_token_hash text,
  invitation_expires_at timestamptz,
  redeemed_by_user_id text,
  redeemed_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by text,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bulk_individual_licenses_batch_seat_unique unique (license_batch_id, seat_number),
  constraint bulk_individual_licenses_display_code_unique unique (display_code),
  constraint bulk_individual_licenses_token_hash_unique unique (secure_token_hash)
);

create unique index if not exists bulk_individual_licenses_redeemed_user_uidx
  on public.bulk_individual_licenses (redeemed_by_user_id)
  where redeemed_by_user_id is not null and status = 'redeemed';

create index if not exists bulk_individual_licenses_org_status_idx
  on public.bulk_individual_licenses (organization_id, status);
create index if not exists bulk_individual_licenses_batch_idx
  on public.bulk_individual_licenses (license_batch_id, seat_number);
create index if not exists bulk_individual_licenses_assigned_email_idx
  on public.bulk_individual_licenses (lower(assigned_email))
  where assigned_email is not null;
create index if not exists bulk_individual_licenses_invitation_hash_idx
  on public.bulk_individual_licenses (invitation_token_hash)
  where invitation_token_hash is not null;

comment on table public.bulk_individual_licenses is 'One unique seat per row; redeem via hashed token, never shared business_code alone.';

-- ---------------------------------------------------------------------------
-- License events (immutable audit)
-- ---------------------------------------------------------------------------
create table if not exists public.bulk_license_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  license_id uuid,
  event_type text not null,
  actor_user_id text,
  actor_type text not null default 'system'
    check (actor_type in ('system', 'user', 'admin', 'stripe', 'webhook')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bulk_license_events_org_idx
  on public.bulk_license_events (organization_id, created_at desc);
create index if not exists bulk_license_events_license_idx
  on public.bulk_license_events (license_id, created_at desc);
create index if not exists bulk_license_events_type_idx
  on public.bulk_license_events (event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- Stripe webhook event ledger (idempotency)
-- ---------------------------------------------------------------------------
create table if not exists public.bulk_stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  environment text,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processing', 'processed', 'failed', 'ignored')),
  attempt_count integer not null default 0,
  processed_at timestamptz,
  error_summary text,
  related_organization_id uuid,
  related_subscription_id uuid,
  payload_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bulk_stripe_webhook_events_status_idx
  on public.bulk_stripe_webhook_events (processing_status, created_at desc);

-- ---------------------------------------------------------------------------
-- Profile columns for bulk entitlement linkage
-- membership_source=bulk_org is app-written (redeem). Profile.stripe_subscription_id
-- stays individual-only; org Stripe IDs live on bulk_subscriptions.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.top_profiles') is not null then
    alter table public.top_profiles
      add column if not exists bulk_organization_id uuid,
      add column if not exists bulk_license_id uuid;
    comment on column public.top_profiles.bulk_organization_id is
      'Active bulk org affiliation when membership_source=bulk_org (app-set; not WorkOS org id).';
    comment on column public.top_profiles.bulk_license_id is
      'Redeemed bulk_individual_licenses.id when membership_source=bulk_org.';
  end if;
  if to_regclass('public.top_qa_profiles') is not null then
    alter table public.top_qa_profiles
      add column if not exists bulk_organization_id uuid,
      add column if not exists bulk_license_id uuid;
    comment on column public.top_qa_profiles.bulk_organization_id is
      'Active bulk org affiliation when membership_source=bulk_org (app-set; not WorkOS org id).';
    comment on column public.top_qa_profiles.bulk_license_id is
      'Redeemed bulk_individual_licenses.id when membership_source=bulk_org.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RLS deny-all (service role only)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = '_top_apply_table_rls_if_exists'
  ) then
    perform public._top_apply_table_rls_if_exists('bulk_organizations');
    perform public._top_apply_table_rls_if_exists('bulk_organization_members');
    perform public._top_apply_table_rls_if_exists('bulk_pending_purchases');
    perform public._top_apply_table_rls_if_exists('bulk_subscriptions');
    perform public._top_apply_table_rls_if_exists('bulk_license_batches');
    perform public._top_apply_table_rls_if_exists('bulk_individual_licenses');
    perform public._top_apply_table_rls_if_exists('bulk_license_events');
    perform public._top_apply_table_rls_if_exists('bulk_stripe_webhook_events');
  else
    alter table public.bulk_organizations enable row level security;
    alter table public.bulk_organization_members enable row level security;
    alter table public.bulk_pending_purchases enable row level security;
    alter table public.bulk_subscriptions enable row level security;
    alter table public.bulk_license_batches enable row level security;
    alter table public.bulk_individual_licenses enable row level security;
    alter table public.bulk_license_events enable row level security;
    alter table public.bulk_stripe_webhook_events enable row level security;
  end if;
end $$;
