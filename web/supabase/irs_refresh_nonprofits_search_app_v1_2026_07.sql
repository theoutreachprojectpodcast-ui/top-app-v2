-- Refresh helper for IRS import directory sync.
-- `nonprofits_search_app_v1` is a MATERIALIZED VIEW — update `nonprofits` then refresh.
-- Paste in Supabase SQL editor. Safe / idempotent.

create or replace function public.refresh_nonprofits_search_app_v1()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    refresh materialized view concurrently public.nonprofits_search_app_v1;
    return 'refreshed_concurrently';
  exception when others then
    refresh materialized view public.nonprofits_search_app_v1;
    return 'refreshed';
  end;
end;
$$;

revoke all on function public.refresh_nonprofits_search_app_v1() from public, anon, authenticated;
grant execute on function public.refresh_nonprofits_search_app_v1() to service_role;

-- Run once now so DC import updates to `nonprofits` appear in directory search:
select public.refresh_nonprofits_search_app_v1();
