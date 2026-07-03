# Security Launch Readiness Report — The Outreach Project

**Assessment date:** June 2026  
**Scope:** Web (Next.js), Mobile (Capacitor), Admin, APIs, Supabase, Stripe, WorkOS, Vercel  
**Auth provider:** WorkOS AuthKit (not Clerk — audit adjusted accordingly)

---

## Executive summary

| Score | Value | Notes |
|-------|-------|-------|
| **Security score** | **78 / 100** | Strong server-side auth + RLS posture; gaps in distributed rate limiting, CSP, MFA |
| **Launch readiness** | **82 / 100** | Suitable for public nonprofit launch with documented residual risk |
| **Production readiness** | **80 / 100** | Run Supabase hardening SQL + verify before treating DB as locked |

The platform follows a **defense-in-depth** model: WorkOS sessions on the edge, API route authorization, Supabase service role (bypasses RLS intentionally), and deny-all RLS for anon/authenticated PostgREST roles.

---

## Phase 1: Security audit

### Authentication (WorkOS)

| Control | Status | Evidence |
|---------|--------|----------|
| Hosted AuthKit sign-in/up | ✅ | `web/src/proxy.js`, `/callback` |
| Iron-sealed session cookies | ✅ | `workosSessionFromCookies.js` |
| Idle session timeout (24h default) | ✅ | `sessionIdle.js`, `/api/auth/activity` |
| Org scope enforcement | ✅ **Fixed** | Removed `profileRow` bypass in `workosRouteAuth.js` |
| Safe return URLs | ✅ | `workosSafeReturn.js` |
| Password reset / social login | ✅ | Delegated to WorkOS hosted UI |

**Findings**

| ID | Severity | Issue | Fix | Verification |
|----|----------|-------|-----|--------------|
| A-01 | **Critical** | Any user with a profile row bypassed org gate | Removed bypass in `classifyRouteSession()` | `verify:security` static check |
| A-02 | **High** | Admin email login grants session without email verification | **Ops:** `ENABLE_ADMIN_EMAIL_LOGIN=0` on prod; warn in `validate-production-env.mjs` | Vercel env review |
| A-03 | Medium | `/api/auth/status` disclosed env configuration | Production response stripped to `{ workos, stripe, sessionIdleTimeoutMs }` | GET `/api/auth/status` on prod |

### Authorization (RBAC)

| Role | Mechanism |
|------|-----------|
| Member | WorkOS session + entitlements (`entitlements.js`) |
| Moderator | `platform_role`, `COMMUNITY_MODERATOR_*` env (server-only) |
| Platform admin | Bootstrap emails + `platform_role: admin` + manual grant |
| Super admin | Same as platform admin (no separate tier in code) |

All `/api/admin/**` routes use `requirePlatformAdminRouteContext` / `requirePlatformAdminMutation`.

**Findings**

| ID | Severity | Issue | Fix | Verification |
|----|----------|-------|-----|--------------|
| Z-01 | **High** | Moderator IDs in `NEXT_PUBLIC_*` env | Removed from `moderatorServer.js`; use `COMMUNITY_MODERATOR_EMAILS` only | `verify:security` |
| Z-02 | Medium | Hardcoded bootstrap admin emails in source | Document migration to `PLATFORM_ADMIN_EMAILS` env only | Manual |

### API security

| Control | Status |
|---------|--------|
| Auth on member routes | ✅ `resolveWorkOSRouteUser()` |
| Same-origin on mutations | ✅ `enforceSameOrigin()` |
| Zod schemas (contact, billing, admin) | ✅ `web/src/lib/security/schemas/` |
| In-memory rate limits | ⚠️ Per-instance only |
| Payload size cap (512 KB) | ✅ `parseJsonBody()` |

**Findings**

| ID | Severity | Issue | Fix | Verification |
|----|----------|-------|-----|--------------|
| API-01 | **High** | Rate limits not distributed on Vercel | **Recommended:** Upstash Redis | Load test |
| API-02 | Medium | Public GET routes unthrottled | Acceptable with service-role scoping; monitor | — |
| API-03 | **Fixed** | Community `photo_url` allowed 120 KB | Capped at 2048 + https scheme | Code review |

### Database security

| Control | Status |
|---------|--------|
| RLS deny-all for clients | ✅ `supabase_public_rls_hardening_2026_06.sql` |
| Service role server-only | ✅ Next.js route handlers |
| Views security invoker | ✅ Hardening migration |
| Audit log table | ✅ `admin_audit_logs` + deny RLS |

**Ops required:** Run hardening SQL in Supabase SQL Editor, then:

```sql
select * from public._top_rls_security_audit() where status <> 'OK';
```

### Mobile security

| Control | Status |
|---------|--------|
| Billing externalized (no Stripe in WebView) | ✅ `billingNavigation.js` |
| `allowNavigation` restricted | ✅ `capacitor.config.js` |
| Deep link return | ✅ `org.theoutreachproject.top://account/refresh` |
| External URL allowlist | ✅ **Added** `externalUrlPolicy.js` |
| Tokens in plaintext local storage | ✅ N/A — WorkOS httpOnly cookies on app origin |

---

## Phase 2: Data protection

### In transit
- HTTPS enforced on Vercel ✅
- HSTS with preload ✅ (`httpHeaders.js`)
- TLS managed by Vercel ✅

### At rest
- Supabase Postgres encryption: platform-managed ✅
- Application secrets in Vercel env ✅
- No Stripe/WorkOS keys in `src/` ✅ (`verify:security` scan)

### Secret management

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| S-01 | Medium | Stripe not in prod env validator | **Fixed** — `STRIPE_SECRET_KEY` + webhook secret required on Vercel Production |

---

## Phase 3: Infrastructure security

### Security headers (via `web/src/proxy.js`)

| Header | Status |
|--------|--------|
| Content-Security-Policy | ⚠️ Permissive (`unsafe-inline`, `unsafe-eval`) |
| Strict-Transport-Security | ✅ |
| X-Frame-Options | ✅ DENY |
| X-Content-Type-Options | ✅ nosniff |
| Referrer-Policy | ✅ |
| Permissions-Policy | ✅ |

**Recommendation:** Tighten CSP with nonces (Next.js 15+) — post-launch hardening.

### CI/CD

| Control | Status |
|---------|--------|
| `security:guards` smoke | ✅ CI |
| `security:audit:ci` fails on high CVEs | ✅ **Fixed** |
| `verify:security` static checks | ✅ **Added** CI |
| Supabase RLS live audit | ⚠️ Manual / needs credentials |

---

## Phase 4: Community protection

| Control | Status |
|---------|--------|
| Pro membership required to post | ✅ |
| Moderation queue (`pending_review`) | ✅ |
| Rate limit 20/min posts | ✅ |
| Staff notifications on submit | ✅ |
| URL validation on links/photos | ✅ **Fixed** |

**Remaining:** CAPTCHA/honeypot on contact form; distributed rate limits for spam.

---

## Phase 5: Stripe & billing security

| Control | Status |
|---------|--------|
| Webhook signature verification | ✅ `constructEvent()` |
| Env-specific webhook secrets | ✅ |
| Membership from server/webhook only | ✅ Profile PATCH blocks tier fields |
| Podcast paid apps verify Stripe session | ✅ |

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| B-01 | Medium | Webhook returned 200 on handler errors | **Fixed** — returns 500 for Stripe retry |
| B-02 | Low | No webhook idempotency table | Recommended post-launch |

---

## Phase 6: Admin security

| Control | Status |
|---------|--------|
| Admin layout server gate | ✅ |
| Mutation audit logs | ✅ Most routes |
| Same-origin + rate limit on mutations | ✅ |

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| AD-01 | **Critical** | Missing audit import on form-submissions PATCH | **Fixed** |
| AD-02 | **High** | MFA not enforced for admins | **Not implemented** — use WorkOS MFA org policy |
| AD-03 | Medium | Incomplete audit on magic-link, contact-settings | Extend `writeAdminAuditLog` calls |

---

## Phase 7: Monitoring & detection

| Control | Status |
|---------|--------|
| Admin audit log inserts | ✅ |
| Failed auth → 401 JSON | ✅ |
| Webhook errors logged | ✅ |

**Remaining:** Centralized SIEM, alerting on failed admin logins, Upstash rate-limit metrics.

---

## Phase 8: Compliance

| Item | Status |
|------|--------|
| Privacy / Terms pages | ✅ `/privacy`, `/terms` |
| App Store encryption doc | ✅ `docs/legal/app-encryption-apple.md` |
| Account deletion | ⚠️ Verify WorkOS + profile deletion flow |
| Data export | ⚠️ Not automated — manual process |

---

## Phase 9: Penetration testing

### Automated (this assessment)

| Check | Result |
|-------|--------|
| `pnpm --dir web run security:guards` | Run in CI |
| `pnpm --dir web run verify:security` | Static posture |
| `pnpm --dir web run security:audit:ci` | Dependency CVEs |
| Secret scan in `src/` | Pass |

### Manual test matrix (recommended pre-launch)

- [ ] IDOR: `/api/me/*` with another user's session cookie
- [ ] Privilege escalation: member → admin API
- [ ] Open redirect: `returnTo` on login/signup
- [ ] XSS: community HTML rendering paths
- [ ] CSRF: POST without Origin header
- [ ] Direct Supabase anon key against tables (expect deny)

---

## Phase 10: Issue register (summary)

### Critical — fixed this pass

1. **A-01** Org bypass via profile row → `workosRouteAuth.js`
2. **AD-01** Broken admin audit on form submissions → import added

### High — fixed or mitigated

1. **A-02** Admin email login → env warning + ops disable
2. **A-03** Auth status disclosure → prod response minimized
3. **Z-01** Public moderator env → server-only
4. **API-01** Distributed rate limits → documented; Upstash recommended
5. **B-01** Webhook silent failures → 500 response
6. **S-01** Stripe env validation → prod build check

### Medium — partial / recommended

1. CSP `unsafe-eval` removal
2. DOMPurify for admin HTML (`sanitizeAdminHtml.js`)
3. SSRF guard on all server fetches → started on trusted scrape
4. Webhook idempotency table
5. MFA via WorkOS organization settings

### Low

1. Admin GET rate limits
2. Contact form CAPTCHA
3. Audit log retention policy

---

## Fixes implemented (this session)

| File | Change |
|------|--------|
| `web/src/lib/auth/workosRouteAuth.js` | Remove org-check bypass |
| `web/src/app/api/admin/form-submissions/route.js` | Add audit log import |
| `web/src/app/api/auth/status/route.js` | Minimize prod response |
| `web/src/app/api/billing/webhook/route.js` | Return 500 on handler error |
| `web/src/lib/capacitor/openExternalUrl.js` | URL allowlist |
| `web/src/lib/security/externalUrlPolicy.js` | **New** |
| `web/src/lib/security/ssrfGuard.js` | **New** |
| `web/src/lib/trusted/trustedResourceWebsiteScrape.js` | SSRF guard |
| `web/src/lib/community/moderatorServer.js` | Server-only moderator env |
| `web/src/app/api/community/posts/route.js` | URL + photo limits |
| `web/scripts/validate-production-env.mjs` | Stripe + admin login warn |
| `web/scripts/verify-security-posture.mjs` | **New** CI check |
| `.github/workflows/ci.yml` | `security:audit:ci`, `verify:security` |
| `web/supabase/supabase_public_rls_hardening_2026_06.sql` | Deny-all RLS (run in Supabase) |

---

## Pre-launch checklist

1. [ ] Run `supabase_public_rls_hardening_2026_06.sql` on production Supabase
2. [ ] Confirm `ENABLE_ADMIN_EMAIL_LOGIN=0` on Vercel Production
3. [ ] Set `COMMUNITY_MODERATOR_EMAILS` (not `NEXT_PUBLIC_*`)
4. [ ] Enable WorkOS MFA for admin organization
5. [ ] Configure Upstash rate limiting (recommended)
6. [ ] Run manual IDOR/admin escalation tests
7. [ ] `pnpm --dir web run validate:env:prod` with production env
8. [ ] `pnpm --dir web run verify:security`

---

## Related documentation

- `security/security-architecture.md`
- `security/security-audit-report.md`
- `security/deployment-hardening-checklist.md`
- `docs/MOBILE_WEB_ACCOUNT_FLOW.md`
- `web/supabase/README_SETUP.md`
