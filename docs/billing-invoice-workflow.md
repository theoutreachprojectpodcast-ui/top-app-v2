# Billing Invoice Workflow

Invoice tooling is available in `/admin/billing`.

## What it does

- Creates a billing record in `public.billing_records`
- Attempts to send a transactional invoice email
- Stores provider success/failure status and error details

## Email provider setup

Current implementation expects Resend-compatible API:

- `ADMIN_EMAIL_PROVIDER=resend`
- `RESEND_API_KEY=<api-key>`
- `ADMIN_EMAIL_FROM=<verified-from-address>`

If configuration is missing, the admin action returns a clear setup error and persists a failed billing record.

## Contact submissions

Contact form submissions are stored in `public.form_submissions` and reviewed in `/admin/contact`.
