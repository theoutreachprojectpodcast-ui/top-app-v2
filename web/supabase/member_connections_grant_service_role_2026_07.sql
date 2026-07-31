-- ============================================================
-- SAFE TO RUN — restore service_role access to member_connections
-- Root cause fix: table existed but API role lacked GRANTs, so
-- connection reads/writes failed while community_follows still had data.
-- ============================================================

alter table public.member_connections
  add column if not exists blocked_by_profile_id uuid references public.top_profiles (id) on delete set null;

grant select, insert, update, delete on table public.member_connections to service_role;
grant all on table public.member_connections to postgres;

-- Keep browser clients blocked via RLS policies (already applied).
alter table public.member_connections enable row level security;
