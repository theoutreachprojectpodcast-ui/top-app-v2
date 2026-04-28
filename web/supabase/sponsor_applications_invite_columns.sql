-- Sponsor application invite scaffold (email provider wiring optional).

alter table public.sponsor_applications
  add column if not exists invite_token text,
  add column if not exists invite_status text not null default 'none',
  add column if not exists invite_sent_at timestamptz,
  add column if not exists invite_last_error text;

comment on column public.sponsor_applications.invite_token is 'Opaque token for WorkOS magic-link or verification flow; do not expose publicly.';
comment on column public.sponsor_applications.invite_status is 'none | pending_provider | sent | accepted | failed';
