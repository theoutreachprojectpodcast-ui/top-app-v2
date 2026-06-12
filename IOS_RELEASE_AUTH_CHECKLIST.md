# iOS release auth checklist

Run before **every** TestFlight upload and App Store submission.

## 1. Production server (PC / Vercel)

- [ ] Latest `main` deployed to `https://theoutreachproject.app`
- [ ] `curl -s https://theoutreachproject.app/api/auth/status` → `"workos":true`
- [ ] `curl -s "https://theoutreachproject.app/auth/workos-go?mode=signin&returnTo=%2F&format=json&native=1" -H "Accept: application/json" -A "TheOutreachProject/Capacitor"` → `"ok":true` and `"url":"https://…"`
- [ ] `curl -s https://theoutreachproject.app/api/mobile/auth-health` → `"ok":true`, `"oauthHandoffTable":true`

## 2. Mac preflight

```bash
cd web
pnpm run mobile:preflight
pnpm run mobile:verify:prod
```

- [ ] No localhost / QA URLs in `ios/App/App/capacitor.config.json`
- [ ] `server.url` = `https://theoutreachproject.app/mobile`
- [ ] `appId` = `com.theoutreachproject.theoutreachproject`

## 3. Capacitor sync + Xcode

```bash
cd web
CAP_SERVER_URL=https://theoutreachproject.app pnpm exec cap sync ios
pnpm run mobile:open:ios
```

- [ ] Increment **Build** number in Xcode (CURRENT_PROJECT_VERSION)
- [ ] **Product → Clean Build Folder**
- [ ] Archive with **Release** configuration
- [ ] Validate archive in Organizer
- [ ] Upload to App Store Connect

## 4. Real-account login (required)

On **physical iPhone** (not simulator only):

| Step | Pass |
|------|------|
| Fresh install → open app → `/mobile` splash | |
| Tap **Sign in** → in-app browser opens (not stuck in WebView Turnstile) | |
| Complete WorkOS login | |
| Auto-return to app (no manual Done required) | |
| Home loads authenticated | |
| Force-quit → reopen → still signed in | |
| Sign out → sign in again | |

## 5. WorkOS dashboard

- [ ] Redirect URI: `https://theoutreachproject.app/callback`
- [ ] Sign-in endpoint: `https://theoutreachproject.app/sign-in`
- [ ] Sign-up endpoint: `https://theoutreachproject.app/sign-up`

## 6. Supabase

- [ ] Table `torp_oauth_mobile_handoffs` exists (see `web/supabase/torp_oauth_mobile_handoffs.sql`)

## Environment matrix

| Build | `CAP_SERVER_URL` | WorkOS redirect |
|-------|------------------|-----------------|
| Production TestFlight | `https://theoutreachproject.app` | `…/callback` on production |
| QA (intentional) | `https://qa.theoutreachproject.app` | QA callback only |
| Local simulator | `http://localhost:3000` or LAN IP | localhost callback in WorkOS **Staging** |

## If auth fails in TestFlight

1. Run `pnpm run mobile:preflight` — if `/auth/workos-go` fails, **server** is broken (fix on PC, deploy Vercel).
2. If preflight passes but device fails: delete app, reinstall; check Supabase handoff table.
3. Rollback: revert Vercel deployment; ship previous TestFlight build if binary regression.

## Logs

- Safari **Develop → [device] → WKWebView** for WebView errors
- Xcode **Console** filter `torp` or `Capacitor`
- Vercel function logs for `/auth/workos-go`, `/callback`, `/api/mobile/oauth-handoff`
