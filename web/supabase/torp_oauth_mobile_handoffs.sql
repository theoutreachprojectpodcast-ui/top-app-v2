-- OAuth mobile handoff bridge: in-app browser → main WebView.
-- Run in Supabase SQL editor. Service-role API routes only.

create table if not exists public.torp_oauth_mobile_handoffs (
  state_key text primary key,
  session_cookies text[] not null default '{}',
  redirect_to text not null default '/',
  expires_at timestamptz not null
);

create index if not exists torp_oauth_mobile_handoffs_expires_idx
  on public.torp_oauth_mobile_handoffs (expires_at);

alter table public.torp_oauth_mobile_handoffs enable row level security;

-- Legacy upgrades (safe to run; app now uses session_cookies only):
-- alter table public.torp_oauth_mobile_handoffs add column if not exists session_cookies text[] not null default '{}';
-- alter table public.torp_oauth_mobile_handoffs add column if not exists redirect_to text not null default '/';
-- alter table public.torp_oauth_mobile_handoffs add column if not exists oauth_code text;
-- alter table public.torp_oauth_mobile_handoffs add column if not exists oauth_state text;
-- alter table public.torp_oauth_mobile_handoffs add column if not exists bridge_token text;
