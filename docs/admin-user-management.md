# Admin user & billing management

## Access

- **URL:** `/admin` (or admin subdomain mapped to `/admin` per `docs/deployment-domains.md`).
- **Gate:** `web/src/app/admin/layout.js` — WorkOS session + org scope + **`isPlatformAdminServer`** (profile `platform_role` and/or `PLATFORM_ADMIN_EMAILS`).

## Users module

- **UI:** `web/src/features/admin/AdminUsersPanel.jsx`
- **API:** `GET /api/admin/users`, `PATCH /api/admin/users/[workosUserId]`
- **Capabilities:** Search by email/name; update **`platform_role`**, **`membership_tier`**, **`membership_status`** (persists to `torp_profiles` / QA table name).

## Billing / invoices

- **Panel:** `AdminBillingPanel` + related routes under `web/src/app/api/admin/billing/`.
- **Persistence:** `billing_records` for invoice email workflow and status.

## Gaps vs full “enterprise CRM”

- No built-in read-only **Stripe invoice list** in admin UI (use Stripe Dashboard or add API read later).
- **Comp / suspend** flows may require explicit PATCH fields or future dedicated actions — role/tier/status edits cover many cases today.

## Related

- `docs/billing-invoice-workflow.md`
- `docs/admin-cms.md`
