# Membership workflow QA checklist

**Pricing target:** Support Membership **$0.99/year** · Pro Membership **$5.99/year**  
**Do not deploy to production until every blocking item below passes in QA/Preview.**

## Automated verification (2026-06-25)

Run: `pnpm --dir web run verify:membership-access`

| Check | Production (`theoutreachproject.app`) | Result |
|-------|---------------------------------------|--------|
| Local Support/Pro tier logic | — | ✅ Pass |
| `POST /api/directory/search` (guest) | HTTP 403 | ✅ Pass |
| `GET /api/community/posts?scope=public` (guest) | HTTP 401 | ✅ Pass |
| `GET /api/trusted/catalog` (guest) | HTTP 401 | ✅ Pass |
| `GET /api/me/saved-orgs` (guest) | HTTP 401 | ✅ Pass |
| ProMembershipGate in production bundle | Present | ✅ Pass |
| iOS Capacitor WebView URL | `https://theoutreachproject.app` | ✅ Pass |
| Android Capacitor WebView URL | `https://theoutreachproject.app` | ✅ Pass |
| `pnpm run verify:auth-freeze` | — | ✅ Pass |
| `pnpm run mobile:verify:prod` | Live auth status | ✅ Pass |

**Production deploy:** `dpl_83kr9N974MhuUvkout2ZHsNo2PqZ` (membership gates + Support/Pro split)

**Mobile note:** iOS TestFlight and Android builds load the **live production WebView** — no new App Store / Play binary required for these web-deployed gates. Force-quit and reopen the app to pick up the new bundle.

## Environment verification

| Check | QA | Prod | Notes |
|-------|----|------|-------|
| `STRIPE_PRICE_SUPPORT_YEARLY` points to $0.99/year price | ☐ | ☐ | Create/replace in Stripe if still $99 |
| `STRIPE_PRICE_PRO_YEARLY` points to $5.99/year price | ☐ | ☐ | |
| `STRIPE_WEBHOOK_TEST_SECRET` (Preview/QA) | ☐ | — | |
| `STRIPE_WEBHOOK_LIVE_SECRET` (Production) | ☐ | ☐ | |
| Webhook endpoint receives `checkout.session.completed` | ☐ | ☐ | Check Vercel logs for `[top] Stripe webhook` |
| Checkout logs `[top] Stripe checkout create` | ☐ | ☐ | |

## Auth + post-login routing

| Scenario | Web | iOS | Android | Pass |
|----------|-----|-----|---------|------|
| New account sign-up → membership paywall (not free app) | ☐ | ☐ | ☐ | |
| Returning sign-in with active Support → home | ☐ | ☐ | ☐ | |
| Returning sign-in with active Pro → home | ☐ | ☐ | ☐ | |
| Sign-in with no membership → `/access` or `/mobile/access` | ☐ | ☐ | ☐ | |
| No infinite spinner after OAuth (`oauth=1`) | ☐ | ☐ | ☐ | |
| No manual “close Safari / reopen app” required | ☐ | ☐ | ☐ | |

## Membership purchase

| Scenario | Web | iOS | Android | Pass |
|----------|-----|-----|---------|------|
| Support checkout completes → active membership → home | ☐ | ☐ | ☐ | |
| Pro checkout completes → active membership → home | ☐ | ☐ | ☐ | |
| Canceled checkout shows cancel state, no access | ☐ | ☐ | ☐ | |
| Failed/incomplete payment does not unlock access | ☐ | ☐ | ☐ | |
| Webhook updates `membership_tier` + `membership_status` | ☐ | ☐ | ☐ | |

## Access control (no bypass)

| Scenario | Expected | Pass |
|----------|----------|------|
| Guest deep-link `/community` → sign-in | ☐ |
| Signed-in, no membership deep-link `/community` → paywall | ☐ |
| Signed-in, no membership refresh on `/` → paywall | ☐ |
| `POST /api/directory/search` without membership → 403 | ☐ |
| `GET /api/community/posts?scope=public` without auth → 401 | ☐ |
| `GET /api/trusted/catalog` without membership → 403 | ☐ |
| Canceled/expired subscription removes access | ☐ |

## Feature gating

| Feature | Support | Pro | Staff/admin | Pass |
|---------|---------|-----|-------------|------|
| Directory | ✓ | ✓ | ✓ | ☐ |
| Community view | ✓ | ✓ | ✓ | ☐ |
| Community post/create | ✗ | ✓ | ✓ | ☐ |
| Premium podcast | ✗ | ✓ | ✓ | ☐ |
| Trusted partner offers | ✗ | ✓ | ✓ | ☐ |
| Support user sees upgrade prompt on Pro-only UI | — | — | — | ☐ |

## Regression

| Check | Pass |
|-------|------|
| WorkOS login still works (web) | ☐ |
| WorkOS login still works (mobile) | ☐ |
| Admin/moderator tools still work without paid tier | ☐ |
| Public marketing pages (`/privacy`, `/terms`, `/download`) still public | ☐ |
| `pnpm run verify:auth-freeze` passes | ☐ |

## Implementation reference

- Access helpers: `web/src/lib/membership/membershipAccess.js`
- Route policy: `web/src/lib/membership/protectedRoutes.js`
- API guard: `web/src/lib/membership/membershipRouteGuard.js`
- Web gate: `WebAppAccessGate.jsx` · Mobile gate: `MobileNativeGate.jsx`
- Paywall: `AppAccessPaywall.jsx` · Upgrade UI: `MembershipUpgradePrompt.jsx`
- Membership data: `top_profiles.membership_tier`, `membership_status`, `stripe_*` (canonical)

## QA sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Engineering | | | |
| Product | | | |

**Production deploy:** blocked until all blocking rows pass and Stripe $0.99 Support price is configured in live env.
