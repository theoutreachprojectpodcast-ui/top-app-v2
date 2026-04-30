# Payments and monetization (v0.6)

## Stripe

- Member and sponsor flows depend on **Stripe Checkout** and **webhooks** updating entitlements and profile billing fields in Supabase. Environment variables are surfaced through **`GET /api/auth/status`** for the client (`stripe`, `stripeMemberRecurringMissingEnv`, etc.).
- WorkOS accounts must not spoof tier changes from the client: **`setMembershipStatus`** is a no-op when `sessionKind === "workos"`; tier comes from Stripe and server-side profile reads.

## Invoices and sponsorship

- Admin invoice workflows and email dispatch are documented in [billing-invoice-workflow.md](./billing-invoice-workflow.md).

## Legacy detail

- `web/docs/BILLING_STRIPE_v0.3.md` — historical implementation notes for the Stripe member path.
