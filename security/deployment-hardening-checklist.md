# Deployment Hardening Checklist

## Environment & Secrets

- [ ] Production/QA/local secrets are isolated and non-overlapping.
- [ ] No service role or private secrets exposed to client bundles.
- [ ] Secret rotation schedule documented and tested.
- [ ] WorkOS, Stripe, and Supabase keys match intended environment.

## Auth & Session

- [ ] WorkOS redirect URIs validated for each deployment host.
- [ ] Cookie domain and security flags verified.
- [ ] Session expiration/idle behavior verified.
- [ ] Logout reliably invalidates authenticated access.

## API Security

- [ ] All mutation endpoints enforce backend auth + authorization.
- [ ] Same-origin + CSRF protection applied consistently.
- [ ] Route-level request throttling applied to abuse-prone endpoints.
- [ ] Input validation strategy enforced (schema + sanitization).

## Database & Storage

- [ ] RLS enabled and validated for all sensitive tables.
- [ ] Storage buckets permissions reviewed and least-privileged.
- [ ] Signed URL TTL and access scope validated.
- [ ] Backup + restore workflow tested.

## Admin Security

- [ ] Admin mutation routes generate audit logs.
- [ ] Destructive actions require explicit confirmation.
- [ ] QA-to-production publishing rights are role-guarded.
- [ ] Admin role assignment changes are auditable.

## Monitoring & Response

- [ ] Error and security event monitoring enabled.
- [ ] Alert routing for auth, webhook, and admin anomalies.
- [ ] Incident response runbook available and tested.

## Release Gate

- [ ] `pnpm run validate:env:prod`
- [ ] `pnpm run verify:workos-auth`
- [ ] `pnpm run build`
- [ ] Route/API smoke tests passed on target environment.
