-- Per-user saved nonprofit EINs (favorites). Safe to run multiple times.

create table if not exists public.top_app_saved_org_eins (
  user_id text not null,
  ein text not null check (ein ~ '^[0-9]{9}$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, ein)
);

create index if not exists top_app_saved_org_eins_user_idx on public.top_app_saved_org_eins (user_id);

alter table public.top_app_saved_org_eins enable row level security;

drop policy if exists top_app_saved_org_eins_owner_all on public.top_app_saved_org_eins;
-- Demo/local: match profile table pattern — adjust to auth.uid() when using real Supabase Auth.
create policy top_app_saved_org_eins_owner_all
  on public.top_app_saved_org_eins
  for all
  using (true)
  with check (true);
