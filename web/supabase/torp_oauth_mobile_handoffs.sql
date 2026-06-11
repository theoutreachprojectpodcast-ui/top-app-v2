-- OAuth code/state bridge: in-app browser → main WebView (PKCE cookie stays in WebView).
-- Run in Supabase SQL editor. Service-role API routes only.

create table if not exists public.torp_oauth_mobile_handoffs (
  state_key text primary key,
  oauth_code text not null,
  oauth_state text not null,
  bridge_token text,
  redirect_to text not null default '/?nav=community',
  expires_at timestamptz not null
);

create index if not exists torp_oauth_mobile_handoffs_expires_idx
  on public.torp_oauth_mobile_handoffs (expires_at);

alter table public.torp_oauth_mobile_handoffs enable row level security;

-- If upgrading from an older `set_cookies text[]` schema:
-- alter table public.torp_oauth_mobile_handoffs add column if not exists oauth_code text;
-- alter table public.torp_oauth_mobile_handoffs add column if not exists oauth_state text;
-- alter table public.torp_oauth_mobile_handoffs add column if not exists bridge_token text;
