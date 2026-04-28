-- Idempotent audit of completed podcast sponsor Stripe Checkout sessions (mode=payment).
-- Written by Stripe webhook on checkout.session.completed; links applications via stripe_checkout_session_id.

create table if not exists public.podcast_sponsor_checkout_events (
  stripe_checkout_session_id text primary key,
  workos_user_id text not null,
  podcast_tier_id text,
  payment_status text not null,
  amount_total integer,
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists podcast_sponsor_checkout_events_workos_idx
  on public.podcast_sponsor_checkout_events (workos_user_id, created_at desc);

comment on table public.podcast_sponsor_checkout_events is 'Stripe podcast one-time checkout completions; source of truth with webhook + optional application row.';
