# Mobile auth production fix

**Date:** 2026-06-11  
**Severity:** P0 — real account login broken on TestFlight and Xcode device builds

## Root cause

Production mobile login calls `GET /auth/workos-go?format=json` to mint PKCE and receive the WorkOS authorize URL before opening the in-app browser (Turnstile-safe flow).

A regression in `web/src/lib/auth/workosSignInUrl.js` referenced an undefined `request` variable:

```js
markNativeShell: shouldMarkOAuthNativeShell(searchParams, request),
```

The function signature only accepted `(searchParams, fallbackReturn)` — no `request` parameter. Production returned:

```json
{ "ok": false, "message": "request is not defined" }
```

HTTP **503** on every sign-in attempt. The Capacitor app surfaced this as vague “server not connecting” / failed login errors.

### Secondary risks (addressed)

| Risk | Mitigation |
|------|------------|
| OAuth handoff stored in serverless memory when Supabase fails | Production now fails loudly instead of silent memory fallback |
| Wrong default bundle in Apple App Site Association | Default `APPLE_BUNDLE_ID` → `com.theoutreachproject.theoutreachproject` |
| Turnstile in WKWebView | Native flows use in-app browser via `launchWorkOSAuth()` |
| No release guardrails | `pnpm run mobile:preflight` |

## Auth provider

**WorkOS AuthKit** (not Clerk/Supabase Auth for primary login). Supabase stores OAuth mobile handoff rows only.

## Files changed

| File | Change |
|------|--------|
| `web/src/lib/auth/workosSignInUrl.js` | Add `request` parameter — **primary fix** |
| `web/src/lib/auth/workosSignUpUrl.js` | Use `shouldMarkOAuthNativeShell(searchParams, request)` |
| `web/src/lib/auth/oauthMobileHandoffServer.js` | No memory fallback in production |
| `web/src/lib/auth/workosGoRoute.js` | Native HTML redirect → `/mobile/sign-in` |
| `web/src/lib/auth/workosNativeAuthLaunch.js` | Clearer network/503 errors |
| `web/src/components/mobile/MobileSplashPage.jsx` | Show `?oauth_error=` from callback |
| `web/src/app/callback/route.js` | Handoff storage error messaging |
| `web/src/app/.well-known/apple-app-site-association/route.js` | Correct bundle + `/callback` paths |
| `web/src/app/api/mobile/auth-health/route.js` | **New** readiness endpoint |
| `web/scripts/mobile-preflight.mjs` | **New** release preflight |
| `web/ios/.../project.pbxproj` | Build number **3** |

## WorkOS dashboard (PC / production env owner)

Ensure these **Redirect URIs** are registered:

| URI | Use |
|-----|-----|
| `https://theoutreachproject.app/callback` | Primary web + in-app browser OAuth callback |
| `com.theoutreachproject.theoutreachproject://callback` | Optional legacy deep link |

**Sign-in / Sign-up redirect endpoints** (WorkOS dashboard → Redirects):

- Sign-in: `https://theoutreachproject.app/sign-in`
- Sign-up: `https://theoutreachproject.app/sign-up`

### Vercel production env (verify on PC)

- `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD` (≥32 chars)
- `NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://theoutreachproject.app/callback`
- `WORKOS_COOKIE_DOMAIN=theoutreachproject.app`
- `SUPABASE_SERVICE_ROLE_KEY` (required for OAuth handoff table)

### Supabase (run once if not applied)

```sql
-- web/supabase/top_oauth_mobile_handoffs.sql
```

## Production URLs (current)

| Purpose | URL |
|---------|-----|
| Capacitor WebView entry | `https://theoutreachproject.app/mobile` |
| OAuth JSON handoff | `https://theoutreachproject.app/auth/workos-go?format=json` |
| In-app browser seed | `https://theoutreachproject.app/auth/workos-browser-start` |
| OAuth callback | `https://theoutreachproject.app/callback` |
| Handoff poll | `https://theoutreachproject.app/api/mobile/oauth-handoff?key=…` |
| Auth health | `https://theoutreachproject.app/api/mobile/auth-health` |
| Deep link (browser done) | `com.theoutreachproject.theoutreachproject://oauth/browser-done?key=…` |

## Mobile login flow (correct)

1. User taps **Sign in** on `/mobile`
2. WebView `fetch` → `/auth/workos-go?format=json` (sets PKCE cookie)
3. Capacitor **Browser** opens `/auth/workos-browser-start` → WorkOS AuthKit (Turnstile OK)
4. WorkOS redirects → `https://theoutreachproject.app/callback`
5. Server saves code/state to `top_oauth_mobile_handoffs`
6. Browser page redirects → `://oauth/browser-done?key=…`
7. `MobileOAuthBrowserFinish` polls handoff, completes session in WebView
8. User lands on `/` logged in

## Preflight (run before every iOS archive)

```bash
cd web
pnpm run mobile:preflight
```

Must pass **after** Vercel production deploy.

## iOS build (Mac)

```bash
cd web
pnpm run mobile:prep:prod    # build + cap sync + verify
pnpm run mobile:preflight    # after deploy
pnpm run mobile:open:ios
```

In Xcode: **Product → Clean Build Folder**, Archive, upload to App Store Connect.

**Build 3** (`CURRENT_PROJECT_VERSION = 3`) includes SplashScreen plugin sync; WebView auth fixes come from **live production** (remote URL architecture).

## Tests completed (automated)

- [x] `pnpm run build`
- [x] `pnpm run mobile:preflight` (after deploy)
- [x] `GET /auth/workos-go?format=json` returns `{ ok: true, url: "https://…" }`

## Manual tests required (device)

- [ ] TestFlight: sign in with real WorkOS account
- [ ] Xcode device install: sign in, restart app, session persists
- [ ] Logout and re-login
- [ ] Password reset link (WorkOS hosted)

## Remaining risks

- **Supabase migration** must exist in production or handoff fails after OAuth (clear error shown).
- **APPLE_TEAM_ID** in Vercel for correct universal links AASA `appID` (optional; custom scheme is primary).
- TestFlight binary must be rebuilt after `cap sync` for native plugin changes; **server fixes deploy via Vercel only**.

## PC-side action if login still fails after deploy

1. Confirm Vercel production deploy includes this fix
2. Run `pnpm run mobile:preflight` against production
3. Apply `top_oauth_mobile_handoffs.sql` in Supabase if `oauthHandoffTable: false` on `/api/mobile/auth-health`
