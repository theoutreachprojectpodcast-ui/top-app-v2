# Security Architecture

## Security Control Layers

1. **Edge/Browser Controls**
   - Centralized response headers in proxy path:
     - Content-Security-Policy
     - Strict-Transport-Security
     - X-Frame-Options
     - X-Content-Type-Options
     - Referrer-Policy
     - Permissions-Policy
     - COOP/CORP

2. **Authentication + Session**
   - WorkOS AuthKit as identity provider.
   - Cookie-based session with idle tracking.
   - Org-scope validation on route auth resolution.

3. **Authorization**
   - Backend-enforced admin role checks via server route context.
   - Route-level access checks for protected APIs.

4. **API Guards**
   - `guardMutation()` for public/auth/billing/community mutation routes.
   - `requirePlatformAdminMutation()` for admin mutation routes.
   - Zod schemas in `web/src/lib/security/schemas/*` for high-risk payloads.
   - Endpoint throttling (baseline per-instance).
   - Planned expansion: distributed throttling store for production.

5. **Database**
   - Supabase with RLS strategy.
   - Service-role usage server-side only.
   - Admin audit logs table with denied direct client access policy.

6. **Observability + Forensics**
   - Persistent admin action logging via `admin_audit_logs` + `writeAdminAuditLog`.
   - CI security smoke + dependency audit job.

7. **Upload Security**
   - `validateImageUpload()` magic-byte verification.
   - `safeUploadObjectPath()` for storage key sanitization.

## Trust Boundaries

- Browser/client boundary.
- Edge/proxy boundary.
- API route execution boundary.
- Supabase DB/storage boundary.
- Third-party service boundaries (WorkOS, Stripe).

## Target End State

- Uniform request validation wrapper across all write APIs.
- Complete RBAC mapping for all roles and resources.
- Centralized distributed rate limiting and abuse detection.
- Full audit trail for all privileged actions.
- Documented incident response + disaster recovery runbooks.
