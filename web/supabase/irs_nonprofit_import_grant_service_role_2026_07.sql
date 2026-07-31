-- Fix: grant service_role access to IRS import tables.
-- Paste in Supabase SQL editor if dry-run fails with:
--   permission denied for table irs_nonprofit_import_batches
-- Safe / idempotent.

revoke all on table public.irs_eo_organizations from anon, authenticated, public;
revoke all on table public.irs_nonprofit_import_batches from anon, authenticated, public;
revoke all on table public.irs_nonprofit_import_errors from anon, authenticated, public;

grant select, insert, update, delete on table public.irs_eo_organizations to service_role;
grant select, insert, update, delete on table public.irs_nonprofit_import_batches to service_role;
grant select, insert, update, delete on table public.irs_nonprofit_import_errors to service_role;
grant usage, select on sequence public.irs_nonprofit_import_errors_id_seq to service_role;
grant all on table public.irs_eo_organizations to postgres;
grant all on table public.irs_nonprofit_import_batches to postgres;
grant all on table public.irs_nonprofit_import_errors to postgres;
