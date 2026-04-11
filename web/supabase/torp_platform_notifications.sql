-- tORP v0.3 — Database-backed in-app notifications (users + staff/moderators).
-- Non-destructive: CREATE IF NOT EXISTS, additive policies only.
-- Access: Next.js route handlers with Supabase service role (same pattern as torp_profiles).

-- -----------------------------------------------------------------------------
-- Org “public update” events (drives favorite_org_updated notifications)
-- -----------------------------------------------------------------------------
create table if not exists public.torp_org_public_updates (
  id uuid primary key default gen_random_uuid(),
  ein text not null check (ein ~ '^[0-9]{9}$'),
  headline text not null,
  summary text,
  link_path text not null default '/trusted',
  source_type text not null default 'manual',
  created_at timestamptz not null default now()
);

create index if not exists torp_org_public_updates_ein_created_idx
  on public.torp_org_public_updates (ein, created_at desc);

alter table public.torp_org_public_updates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'torp_org_public_updates'
      and policyname = 'torp_org_public_updates_block_anon'
  ) then
    create policy torp_org_public_updates_block_anon
      on public.torp_org_public_updates for all to anon
      using (false) with check (false);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'torp_org_public_updates'
      and policyname = 'torp_org_public_updates_block_authenticated'
  ) then
    create policy torp_org_public_updates_block_authenticated
      on public.torp_org_public_updates for all to authenticated
      using (false) with check (false);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Notifications (per recipient profile row in torp_profiles)
-- -----------------------------------------------------------------------------
create table if not exists public.torp_platform_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.torp_profiles (id) on delete cascade,
  audience_scope text not null default 'user'
    check (audience_scope in ('user', 'staff')),
  notification_type text not null,
  title text not null,
  message text,
  link_path text,
  entity_type text,
  entity_id text,
  status text not null default 'unread'
    check (status in ('unread', 'read', 'archived')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  read_at timestamptz,
  delivered_in_app_at timestamptz not null default now(),
  delivered_email_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists torp_platform_notifications_recipient_status_created_idx
  on public.torp_platform_notifications (recipient_profile_id, status, created_at desc);

create index if not exists torp_platform_notifications_type_entity_idx
  on public.torp_platform_notifications (notification_type, entity_id)
  where entity_id is not null;

alter table public.torp_platform_notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'torp_platform_notifications'
      and policyname = 'torp_platform_notifications_block_anon'
  ) then
    create policy torp_platform_notifications_block_anon
      on public.torp_platform_notifications for all to anon
      using (false) with check (false);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'torp_platform_notifications'
      and policyname = 'torp_platform_notifications_block_authenticated'
  ) then
    create policy torp_platform_notifications_block_authenticated
      on public.torp_platform_notifications for all to authenticated
      using (false) with check (false);
  end if;
end $$;

comment on table public.torp_platform_notifications is
  'In-app notifications; read/write only via Next API + service role (WorkOS — no Supabase JWT RLS).';
comment on column public.torp_platform_notifications.audience_scope is
  'user = product notifications; staff = moderator/operational (still keyed to recipient torp_profiles row).';
comment on column public.torp_platform_notifications.delivered_email_at is
  'Reserved for future email delivery; NULL until outbound provider is wired.';
