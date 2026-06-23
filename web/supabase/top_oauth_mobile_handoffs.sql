-- OAuth mobile handoff bridge: in-app browser → main WebView.
-- Run in Supabase SQL editor. Service-role API routes only.

create table if not exists public.top_oauth_mobile_handoffs (
  state_key text primary key,
  set_cookies text[] not null default '{}',
  redirect_to text not null default '/',
  expires_at timestamptz not null
);

create index if not exists top_oauth_mobile_handoffs_expires_idx
  on public.top_oauth_mobile_handoffs (expires_at);

alter table public.top_oauth_mobile_handoffs enable row level security;

-- Legacy upgrades (safe to run):
-- alter table public.top_oauth_mobile_handoffs add column if not exists set_cookies text[] not null default '{}';
-- alter table public.top_oauth_mobile_handoffs add column if not exists redirect_to text not null default '/';
