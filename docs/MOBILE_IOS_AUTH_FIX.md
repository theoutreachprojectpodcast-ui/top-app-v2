# Mobile iOS / TestFlight auth fix (2026-06)

## Root causes (stacked)

1. **Web auth regressions (fixed prior)** — Wrong PKCE cookie name, callback response rebuild dropping session cookies, and mobile Safari deep-link traps on `/callback` broke production web sign-in. Those invariants are now guarded in CI (`verify:auth-freeze`).

2. **Post-auth routing in Capacitor** — Mobile sign-in returned users to `/mobile/access` immediately after OAuth. Profile hydration was still in flight, causing infinite loading or paywall flashes before the authenticated home loaded.

3. **Stale shell / QA fallbacks** — `capacitor://localhost` shells could fall back to QA origins. Production TestFlight builds must always resolve to `https://theoutreachproject.app`.

4. **Native callback errors stranded users** — OAuth failures rendered HTML error pages inside the WebView instead of returning to `/mobile` with a clear retry message.

5. **Email verification codes (WorkOS-side)** — Member email-code sign-in is handled entirely by WorkOS AuthKit hosted UI (not a custom API). Delivery failures are usually WorkOS dashboard config: passwordless enabled, sender domain verified, templates enabled, rate limits, and Turnstile compatibility in WKWebView.

## Files changed

| Area | Files |
|------|-------|
| Auth freeze guards | `web/scripts/auth-production-guards.mjs`, `.cursor/rules/auth-production-freeze.mdc`, `.github/workflows/ci.yml` |
| Production smoke | `web/scripts/production-http-smoke.mjs`, `web/package.json` |
| Post-auth landing | `web/src/app/mobile/auth/complete/page.js`, `web/src/components/mobile/MobileAuthCompleteClient.jsx` |
| Mobile sign-in returnTo | `web/src/lib/auth/workosReturnTo.js`, `MobileSplashPage.jsx`, `mobile/sign-in/page.js` |
| Native error UX | `web/src/lib/auth/workosCallbackErrors.js`, `callback/route.js`, `workosCallbackHandler.js` |
| Gate + loading | `MobileNativeGate.jsx`, `MobileLoadingOverlay.jsx` |
| Production URLs | `webAppOrigin.js`, `ios/App/App/App.entitlements`, `mobile-preflight.mjs` |
| Universal links | `.well-known/apple-app-site-association/route.js`, `mobileDeepLinks.js` |

## Env vars (production — verify in Vercel, do not change casually)

| Variable | Expected |
|----------|----------|
| `NEXT_PUBLIC_APP_URL` | `https://theoutreachproject.app` |
| `WORKOS_COOKIE_DOMAIN` | `theoutreachproject.app` |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | `https://theoutreachproject.app/callback` |
| `WORKOS_CLIENT_ID` | Production client ID |
| `WORKOS_API_KEY` | Production API key |
| `WORKOS_COOKIE_PASSWORD` | ≥32 characters |
| `APPLE_TEAM_ID` | For universal links AASA (optional but recommended) |

**WorkOS dashboard (manual verification):**

- Redirect URI: `https://theoutreachproject.app/callback`
- AuthKit: Email OTP / passwordless enabled for members
- Sender domain verified; email templates enabled
- No org restriction blocking member sign-up

## Validation commands

```bash
# Auth regression guards (CI)
pnpm --dir web run verify:auth-freeze

# Production HTTP smoke (requires live deploy)
pnpm --dir web run smoke:production:http

# Mobile Capacitor + auth readiness
pnpm --dir web run mobile:preflight
```

## TestFlight validation checklist

Run on a physical device with a **production** TestFlight build after `mobile:prep:prod` + Xcode archive:

- [ ] App opens to `/mobile` splash (not Safari, not black screen)
- [ ] Sign in → WorkOS AuthKit loads inside app WebView
- [ ] Email code sends and arrives (check spam; verify WorkOS sender if not)
- [ ] Enter code → returns to app → `/mobile/auth/complete` → authenticated home `/`
- [ ] No Safari “page couldn't load” trap
- [ ] Close app, reopen → session persists, profile loads
- [ ] Logout → returns to `/mobile` splash
- [ ] New account signup completes and lands in app
- [ ] User without App Access lands on `/mobile/access` paywall (not stranded)

## TestFlight validation results

> **Status:** Pending device validation after deploy + new TestFlight build.
>
> Record results here after testing with real accounts on TestFlight build `___`.

## Architecture (current)

```
/ (TopApp home)
  → launchWorkOSAuth(/auth/workos-go?native=1&returnTo=/mobile/auth/complete)
  → WorkOS AuthKit (email code / SSO / password)
  → https://theoutreachproject.app/callback (same WebView)
  → /mobile/auth/complete (session refresh)
  → / (home) or /access (paywall)
```

Legacy paths (`/mobile-auth/callback`, Capacitor Browser sheet, custom scheme callbacks) remain for older builds but are not used by the primary WebView flow.
