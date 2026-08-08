-- Fix: grant service_role access to bulk licensing tables.
-- Run in Supabase SQL Editor (production / QA) if checkout returns organization_create_failed
-- with permission denied / empty org create.
-- Idempotent.

grant select, insert, update, delete on table public.bulk_organizations to service_role;
grant select, insert, update, delete on table public.bulk_organization_members to service_role;
grant select, insert, update, delete on table public.bulk_pending_purchases to service_role;
grant select, insert, update, delete on table public.bulk_subscriptions to service_role;
grant select, insert, update, delete on table public.bulk_license_batches to service_role;
grant select, insert, update, delete on table public.bulk_individual_licenses to service_role;
grant select, insert, update, delete on table public.bulk_license_events to service_role;
grant select, insert, update, delete on table public.bulk_stripe_webhook_events to service_role;
