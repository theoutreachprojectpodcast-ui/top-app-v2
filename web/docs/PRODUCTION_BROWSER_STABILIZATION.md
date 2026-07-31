# Production browser stabilization

## Production source of truth

| Item | Value |
|------|--------|
| Vercel team | `the-outreach-project` |
| Canonical project | **`the-outreach-project-app`** |
| Production domain | `https://theoutreachproject.app` |
| `www` | 307 → apex |
| Git repository | `theoutreachprojectpodcast-ui/top-app-v2` |
| Production branch | `main` |
| Capacitor / mobile WebView URL | `https://theoutreachproject.app` |
| Service worker | **None** (manifest + icons only) |
| Android WebView floor | Chromium **111+** (`capacitor.config.js`) |

### Other Vercel projects (do not use as the product)

| Project | URL | Notes |
|---------|-----|--------|
| `top-app` | `https://top-app-brown-alpha.vercel.app` | **Stale**; may still return 200. Archive in Vercel. |
| `web` | `https://web-the-outreach-project.vercel.app` | Stale / 404 |
| `outreach-project-links` | links helper | Not the member app |
| `outreach-trust-admin` | admin helper | Not the member app |

Bookmarks or shared links to stale project URLs are a primary cause of “different browsers see different apps.”

## Supported browsers

- Chrome / Edge ≥ 111
- Firefox ≥ 115
- Safari / iOS Safari ≥ 16.4
- Android Chrome (same Chromium floor)
- Capacitor iOS / Android WebViews loading production apex (Android WebView ≥ 111)

Unsupported browsers should see a recoverable error boundary + refresh, not a blank page.

## Build identity

Staff: **Admin → Status** shows commit SHA, deployment ID, environment, app version (`GET /api/admin/build`).

Public (non-secret):

- HTML responses: `x-top-commit`, `x-top-deployment`, `x-top-env`, `x-top-version`
- `GET /api/health` → `build: { commitSha, environment, … }`

Post-deploy verify:

```bash
TOP_EXPECT_COMMIT=<sha> pnpm --dir web run smoke:production:http
PLAYWRIGHT_BASE_URL=https://theoutreachproject.app pnpm --dir web run test:e2e:smoke
```

## Cache policy

- Document HTML: `public, max-age=0, must-revalidate` (+ build headers)
- Capacitor UA HTML: `no-store, must-revalidate`
- Hashed `/_next/static`: Next/Vercel long-cache (unchanged)
- Manifest: must-revalidate (`?v=6` on link)
- **No service worker** — avoids old HTML + new JS shell mismatches

## Platform-required forks (not browser forks)

`isCapacitorNative()` changes auth return paths, health gates, and some chrome. That is intentional for installed apps.

Web Chrome / Safari / Edge / Firefox must share one application tree. Header download / admin placement uses CSS media slots (`.topbarDownloadSlot--phoneOnly` / `--desktopOnly`) to avoid hydration flicker.

## Manual device matrix (human QA)

Record **build identity** (commit) from Admin → Status or `x-top-commit` for every row.

| Environment | Home | Auth | Directory | Trusted | Community | Profile | Saved orgs | Notes |
|-------------|------|------|-----------|---------|-----------|---------|------------|-------|
| Chrome Windows | | | | | | | | |
| Edge Windows | | | | | | | | |
| Firefox Windows | | | | | | | | |
| Safari macOS | | | | | | | | |
| iOS Safari current | | | | | | | | |
| iOS Safari older supported | | | | | | | | |
| Android Chrome | | | | | | | | |
| iPad Safari | | | | | | | | |
| iOS Capacitor release | | | | | | | | Store build may lag WebView URL sync |
| Android Capacitor release | | | | | | | | Requires WebView 111+ |

## Mobile store releases

Capacitor loads the **remote** production apex. A Vercel deploy updates the WebView content without a store release **unless** native plugins / embedded `capacitor.config` / binary assets change. If embedded `server.url` were wrong, a new store build would be required — currently it targets `https://theoutreachproject.app`.

## Automated gates

- `pnpm --dir web run smoke:production:http` — apex/www, health build, stale-host warnings
- `pnpm --dir web run test:e2e:smoke` — Playwright Chromium / Firefox / WebKit (+ mobile viewports)
- CI: `.github/workflows/ci.yml` + `release-gates.yml` run production HTTP + Playwright smoke on `main`

## Release process (short)

1. Dev validation + unit/prebuild scripts  
2. QA deploy + QA HTTP smoke  
3. Playwright cross-browser smoke  
4. Manual matrix sample (Safari + Chrome + one mobile)  
5. Production deploy (`pnpm run deploy:prod` / Vercel)  
6. Production HTTP smoke + Playwright with optional `TOP_EXPECT_COMMIT`  
7. Confirm Admin build identity matches intended SHA  
8. Monitor browser-family console diagnostics (`logClientDiagnosticError`)

## Completion findings (implementation pass)

### Root causes of cross-browser inconsistency

1. **Stale Vercel project still live** (`top-app-brown-alpha.vercel.app`) — users can bookmark a non-canonical app.
2. **No build/commit visibility** — testers could not prove browsers shared one release.
3. **No multi-engine e2e** — only HTTP smoke; Safari/Firefox regressions undetected.
4. **Safari CSS gaps** — bare `100vh` / missing `-webkit-backdrop-filter` on some shells.
5. **JS media-query chrome placement** — download/admin slots could flash between desktop and phone trees after hydrate.
6. **Manifest theme drift** — root `manifest.json` used dark theme vs public light brand theme.
7. **No service worker** — not a stale-SW class issue (good); document caching still needed explicit policy.

### Verified this pass

- Playwright **24/24** passed against production apex (Chromium, Firefox, WebKit).
- Production HTTP smoke passed (warns that stale `top-app` project is still live — archive recommended).
- Capacitor production URL remains `https://theoutreachproject.app` (no store release required for WebView content sync).

### Files changed (high level)

- Build identity: `buildIdentity.js`, `/api/admin/build`, Admin Status panel, `/api/health.build`, HTML `x-top-*` headers via `next.config.mjs`
- Cache / PWA: document Cache-Control, manifest `?v=6`, aligned root `manifest.json`
- CSS: `dvh`/`svh`, `-webkit-backdrop-filter`, browserslist
- Hydration: CSS slots for download/admin; `AppErrorBoundary` + `clientDiagnostics`
- Tests: Playwright suite + CI/release-gates wiring; extended production smoke
- Docs: this file

### Still requires human / ops

- Archive Vercel project `top-app` (and unused `web`) after confirming no DNS/bookmarks depend on them.
- Fill the manual device matrix (especially physical iOS Safari + Capacitor store builds).
- Deploy this branch to production so `x-top-commit` / Admin build identity appear live.
- Optional: BrowserStack if you need real Safari macOS / older iPhones beyond WebKit engine.
