# Launch Readiness Next Steps

This document captures the current launch sequence for production readiness, real auth, functional admin operations, and end-to-end go-live.

## Priority Execution Order

1. **Environment + migrations**
   - Validate Production env: WorkOS Production keys, Stripe live keys/webhook, Supabase keys, `APP_BASE_URL`, `WORKOS_COOKIE_DOMAIN`, `NEXT_PUBLIC_ENABLE_DEMO_FLOWS=0`.
   - Apply required Supabase migrations in `web/supabase/`.
2. **Auth + billing smoke**
   - Validate WorkOS sign-up/sign-in/sign-out on apex, `www`, and admin host.
   - Validate one real checkout path and webhook-driven entitlement update.
3. **Public workflow QA**
   - Run profile/onboarding, directory/trusted, community, sponsors, notifications, and podcast flow checks.
4. **Admin operational hardening**
   - Keep fully functional admin surfaces enabled.
   - Hide/replace placeholder admin pages before launch claims.
5. **Mobile + legal/comms pass**
   - Capacitor build/device smoke.
   - Confirm production billing/fee language in sponsor/trusted flows.

## Must-pass Commands

From `web/`:

```bash
pnpm run validate:env:prod
pnpm run verify:workos-auth
pnpm run build
pnpm run smoke:routes
```

## Launch Blockers (Current)

- Production WorkOS/Stripe/Supabase env + redirect/domain alignment.
- All required Supabase migrations applied.
- Sponsor/podcast billing fully live (no billing-not-configured branches on live env).
- Placeholder admin pages removed from primary launch narrative or completed.
- Podcast members-only CTA either implemented with real gating or removed.
