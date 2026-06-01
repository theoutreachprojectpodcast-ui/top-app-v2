# Security Audit Report

Date: 2026-05-26  
Scope: localhost, QA, production posture across web/mobile/app infra.

## Critical

### C-01: Missing unified security headers at edge
- Attack vector: Browser-based attacks (clickjacking, MIME confusion, weak framing policy).
- Affected systems: Next edge/proxy response path.
- Exploit scenario: Attacker frames app or abuses weak browser policy defaults.
- Remediation approach: Centralized hard security headers (CSP, HSTS, XFO, nosniff, referrer policy, permissions policy, COOP/CORP).
- Remediation status: **Fixed in code** via `web/src/lib/security/httpHeaders.js` + `web/src/proxy.js`.

### C-02: No persistent admin audit log for sensitive mutations
- Attack vector: Insider abuse / compromised admin account with low traceability.
- Affected systems: Admin mutation APIs.
- Exploit scenario: Malicious role/content changes with incomplete forensics.
- Remediation approach: DB audit table + write helper + route integration.
- Remediation status: **Mostly fixed** — audit logging added across major admin mutation routes via `writeAdminAuditLog` + `admin_audit_logs` table migration.

### C-03: Origin validation not uniformly enforced on state-changing routes
- Attack vector: CSRF-style cross-origin mutation attempts.
- Affected systems: API routes with side effects.
- Exploit scenario: Authenticated user tricked into firing forged cross-origin requests.
- Remediation approach: Same-origin enforcement helper on mutation routes.
- Remediation status: **Mostly fixed** — mutation routes now use centralized `guardMutation` / `requirePlatformAdminMutation`; Stripe webhook skips origin check by design.

## High

### H-01: Rate limiting not uniformly present on sensitive endpoints
- Attack vector: brute-force, abuse, resource exhaustion.
- Affected systems: auth activity + admin mutation + public form writes.
- Exploit scenario: attacker floods endpoints for denial or abuse.
- Remediation approach: endpoint throttling layer.
- Remediation status: **Mostly fixed** with per-instance limiter across admin/public mutation routes; production shared-store limiter (Redis/Upstash) still recommended.

### H-02: Placeholder admin pages remain routable
- Attack vector: attack surface discovery / confusion / accidental insecure future additions.
- Affected systems: `/admin/forms`, `/admin/media-library`, `/admin/settings`, `/admin/analytics`.
- Exploit scenario: unfinished capabilities become partially implemented without hard controls.
- Remediation approach: hide from nav until complete or ship hardened implementations.
- Remediation status: **Open**.

### H-03: Security controls distributed, not centralized policy-driven
- Attack vector: inconsistent enforcement between routes/features.
- Affected systems: API handlers and frontend-auth state boundaries.
- Exploit scenario: one unsecured mutation route bypasses expected controls.
- Remediation approach: central route guards + standard mutation wrapper.
- Remediation status: **In progress**.

## Medium

### M-01: No formal incident-response runbook in repo
- Remediation status: **Open** (added in this initiative as a first draft).

### M-02: No explicit deployment hardening checklist in `/security`
- Remediation status: **Open** (added in this initiative as a first draft).

### M-03: Admin security monitoring lacks dedicated event taxonomy
- Remediation status: **Open** (table supports it; taxonomy rollout pending).

## Low

### L-01: Inconsistent endpoint-level input schema strategy
- Remediation status: **In progress** — Zod validation added for contact, billing checkout, admin invoice, guest application, admin magic-link; remaining routes should adopt shared schemas.

### L-02: Documentation of QA/prod security isolation spread across multiple docs
- Remediation status: **In progress** (consolidated security docs added).
