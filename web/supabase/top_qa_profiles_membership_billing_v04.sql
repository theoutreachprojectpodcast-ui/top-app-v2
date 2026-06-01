-- Mirror membership billing columns on QA profile table when using top_qa_profiles.

alter table public.top_qa_profiles
  add column if not exists renewal_date timestamptz,
  add column if not exists billing_status text,
  add column if not exists sponsor_tier text,
  add column if not exists payment_method_summary jsonb not null default '{}'::jsonb;
