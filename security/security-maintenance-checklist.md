# Security Maintenance Checklist

## Weekly

- [ ] Review authentication and admin error logs.
- [ ] Review suspicious rate-limit spikes.
- [ ] Review dependency advisories for direct dependencies.

## Monthly

- [ ] Rotate non-critical secrets where possible.
- [ ] Validate RLS and privileged route behavior with spot checks.
- [ ] Review admin audit log anomalies and unusual access times.

## Quarterly

- [ ] Run full endpoint abuse and RBAC regression suite.
- [ ] Perform restore test from backup snapshot.
- [ ] Run dependency and supply-chain audit.
- [ ] Revalidate incident-response contacts and escalation paths.

## Pre-Release

- [ ] Run deployment hardening checklist.
- [ ] Reconfirm QA vs production isolation.
- [ ] Ensure no debug/demo behavior is enabled in production.
