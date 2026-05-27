-- Admin audit log table for security/compliance visibility.
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_workos_user_id text null,
  actor_email text null,
  action text not null,
  resource_type text null,
  resource_id text null,
  metadata jsonb not null default '{}'::jsonb,
  request_ip text null,
  user_agent text null
);

create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_actor_idx on public.admin_audit_logs (actor_workos_user_id);
create index if not exists admin_audit_logs_action_idx on public.admin_audit_logs (action);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "admin_audit_logs_no_client_access" on public.admin_audit_logs;
create policy "admin_audit_logs_no_client_access" on public.admin_audit_logs
  as permissive
  for all
  to public
  using (false)
  with check (false);
