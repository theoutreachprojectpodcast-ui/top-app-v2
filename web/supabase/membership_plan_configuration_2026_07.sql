-- Membership plan configuration (Support feature flag + Pro metadata).
-- Non-destructive. Defaults Support Membership to disabled (Pro-only product).
-- Safe to re-run.

begin;

create table if not exists public.membership_plan_configuration (
  id text primary key default 'default',
  support_membership_enabled boolean not null default false,
  pro_membership_enabled boolean not null default true,
  support_stripe_price_id text,
  pro_stripe_price_id text,
  support_display_name text not null default 'Support Membership',
  pro_display_name text not null default 'Pro Membership',
  support_price_label text not null default '$0.99/yr',
  pro_price_label text not null default '$5.99/yr',
  notes text,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint membership_plan_configuration_singleton check (id = 'default')
);

comment on table public.membership_plan_configuration is
  'Singleton membership plan availability. support_membership_enabled defaults false (Pro-only).';

create table if not exists public.membership_configuration_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  actor_workos_user_id text,
  actor_email text,
  environment text,
  reason text,
  request_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists membership_configuration_audit_log_created_idx
  on public.membership_configuration_audit_log (created_at desc);

create index if not exists membership_configuration_audit_log_action_idx
  on public.membership_configuration_audit_log (action, created_at desc);

alter table public.membership_plan_configuration enable row level security;
alter table public.membership_configuration_audit_log enable row level security;

-- Deny browser roles; app uses service role.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'membership_plan_configuration'
      and policyname = 'membership_plan_configuration_block_anon'
  ) then
    create policy membership_plan_configuration_block_anon
      on public.membership_plan_configuration
      as restrictive for all to anon using (false) with check (false);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'membership_plan_configuration'
      and policyname = 'membership_plan_configuration_block_authenticated'
  ) then
    create policy membership_plan_configuration_block_authenticated
      on public.membership_plan_configuration
      as restrictive for all to authenticated using (false) with check (false);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'membership_configuration_audit_log'
      and policyname = 'membership_configuration_audit_log_block_anon'
  ) then
    create policy membership_configuration_audit_log_block_anon
      on public.membership_configuration_audit_log
      as restrictive for all to anon using (false) with check (false);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'membership_configuration_audit_log'
      and policyname = 'membership_configuration_audit_log_block_authenticated'
  ) then
    create policy membership_configuration_audit_log_block_authenticated
      on public.membership_configuration_audit_log
      as restrictive for all to authenticated using (false) with check (false);
  end if;
end $$;

insert into public.membership_plan_configuration (
  id,
  support_membership_enabled,
  pro_membership_enabled,
  updated_at
)
values ('default', false, true, now())
on conflict (id) do nothing;

-- Also mirror into admin_settings for tools that already read that table.
insert into public.admin_settings (setting_key, setting_value, updated_at)
values (
  'membership.plan_availability',
  jsonb_build_object(
    'supportMembershipEnabled', false,
    'proMembershipEnabled', true,
    'updatedAt', now()
  ),
  now()
)
on conflict (setting_key) do nothing;

commit;
