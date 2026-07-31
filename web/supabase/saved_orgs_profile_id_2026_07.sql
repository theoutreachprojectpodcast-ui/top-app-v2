-- Optional profile_id on saved orgs for reconciliation / support joins.
-- Non-destructive: additive column + index + backfill. Keeps (user_id, ein) PK.
-- Safe for Supabase SQL editor (no DROP / TRUNCATE / DELETE of user data).

alter table public.top_app_saved_org_eins
  add column if not exists profile_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'top_app_saved_org_eins_profile_id_fkey'
  ) then
    begin
      alter table public.top_app_saved_org_eins
        add constraint top_app_saved_org_eins_profile_id_fkey
        foreign key (profile_id) references public.top_profiles (id)
        on delete set null;
    exception
      when others then
        raise notice 'profile_id FK not applied: %', sqlerrm;
    end;
  end if;
end
$$;

create index if not exists top_app_saved_org_eins_profile_idx
  on public.top_app_saved_org_eins (profile_id);

-- Backfill profile_id from WorkOS mapping (user_id = workos_user_id).
update public.top_app_saved_org_eins s
set profile_id = p.id
from public.top_profiles p
where s.profile_id is null
  and nullif(trim(p.workos_user_id), '') is not null
  and p.workos_user_id = s.user_id;
