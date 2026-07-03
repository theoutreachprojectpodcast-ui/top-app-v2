# Production stability incident — The Outreach Project

**Status:** Mitigation in progress (2026-06-09)  
**Canonical production domain:** `https://theoutreachproject.app`  
**Invalid domain (no DNS):** `outreachproject.app` — causes “server cannot be found”

---

## Root cause summary

| Issue | Root cause | Fix |
|-------|------------|-----|
| “Server cannot be found” | Users/bookmarks use `outreachproject.app` (no DNS) | Document correct domain; add UI hints in Capacitor offline page |
| Mobile stuck / connection loop | `capacitor-www/error.html` redirected to `/mobile` (deprecated entry) | Redirect to `/` + health check |
| Auth callback failures (prior) | Wrong PKCE cookie name, callback response rebuild | Fixed in `167c123` — guarded by `verify:auth-freeze` |
| Splash crash (prior) | Missing `useMobileShell` import | Fixed in `MobileSplashPage.jsx` |
| Scattered hardcoded URLs | Multiple files duplicated production hostname | Centralized in `src/lib/runtime/appUrls.js` |
| No deployment health gates | Smoke tests not blocking bad deploys | Expanded `smoke:production:http` + CI job on `main` |

**Live probe (2026-06-09):** `theoutreachproject.app` returns 200 for `/`, `/sign-in`, `/api/health`, WorkOS-go with PKCE cookie. `outreachproject.app` does not resolve.

---

## Files changed (this incident)

| Area | Files |
|------|-------|
| Canonical URLs | `web/src/lib/runtime/appUrls.js` |
| Health API | `web/src/lib/runtime/productionHealth.js`, `web/src/app/api/health/**` |
| Mobile health gate | `web/src/components/capacitor/MobileProductionHealthGate.jsx` |
| Mobile auth routes | `web/src/app/mobile/auth/start`, `callback`, `home`, `post-login` |
| Offline recovery | `web/capacitor-www/error.html` |
| Middleware | `web/src/proxy.js` (mobile auth + health bypass) |
| Smoke / CI | `web/scripts/production-http-smoke.mjs`, `.github/workflows/ci.yml` |
| Env validation | `web/scripts/validate-production-env.mjs` |

---

## Environment variables (Vercel Production — verify, do not rotate casually)

| Variable | Required value |
|----------|----------------|
| `NEXT_PUBLIC_APP_URL` | `https://theoutreachproject.app` |
| `APP_BASE_URL` | `https://theoutreachproject.app` |
| `WORKOS_COOKIE_DOMAIN` | `theoutreachproject.app` |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | `https://theoutreachproject.app/callback` |
| `WORKOS_CLIENT_ID` | Production (`client_…`) |
| `WORKOS_API_KEY` | Production (`sk_live_…`) |
| `WORKOS_COOKIE_PASSWORD` | ≥32 characters |
| Supabase keys | Production project |

**WorkOS dashboard (manual):**

- Redirect URI: `https://theoutreachproject.app/callback`
- Sign-in endpoint: `https://theoutreachproject.app/sign-in`
- Email OTP / passwordless enabled; sender domain verified
- No rate-limit blocking member sign-up

---

## DNS / hosting

| Host | Status |
|------|--------|
| `theoutreachproject.app` | ✅ Production (Vercel) |
| `www.theoutreachproject.app` | ✅ 301 → apex |
| `outreachproject.app` | ❌ No DNS — register or redirect if brand requires it |
| `qa.theoutreachproject.app` | QA only — not for TestFlight |

---

## Validation commands

```bash
pnpm --dir web run verify:auth-freeze
pnpm --dir web run validate:env:prod
pnpm --dir web run smoke:production:http
pnpm --dir web run mobile:preflight
```

---

## Rollback plan

1. **Vercel:** Project → Deployments → last green deployment → **Promote to Production**
2. **Verify:** `pnpm --dir web run smoke:production:http`
3. **If auth broken:** do not change PKCE cookie name or callback handler without `verify:auth-freeze` review
4. **TestFlight:** Revert to last known good build in App Store Connect if native shell URL wrong

**Rollback trigger:** Any of: `/api/health` 503, homepage 5xx, WorkOS-go missing PKCE cookie, callback 500 on valid code.

---

## Monitoring plan

| Check | Endpoint / tool | Frequency |
|-------|-----------------|-----------|
| Uptime | `/api/health` | External monitor (5 min) |
| Auth config | `/api/health/auth` | After each deploy |
| Database | `/api/health/db` | After each deploy |
| Mobile | `/api/health/mobile` | TestFlight pre-release |
| Full smoke | `smoke:production:http` | CI on push to `main` |

**Log safely:** auth callback errors (`[top] WorkOS callback failed`), health 503s. Never log tokens/cookies.

---

## TestFlight validation (pending device)

- [ ] App opens `https://theoutreachproject.app/`
- [ ] Health gate passes or shows retry
- [ ] Sign in via TopApp → WorkOS → callback → home
- [ ] Email code sends and completes
- [ ] Session persists after force-quit
- [ ] No Safari trap; no infinite loading

---

## Long-term

- Register `outreachproject.app` → 301 to `theoutreachproject.app` (optional brand fix)
- UptimeRobot/Pingdom on `/api/health`
- WorkOS webhook for auth failure alerts
