# Capacitor (TOP v0.3) — stacked web + Android + iOS

This document describes how Capacitor is integrated **without** forking the Next.js app. The **browser and `next dev` / `next start` experience remains primary**.

## Phase 0 — Git checkpoint (completed)

Before Capacitor files were added, a checkpoint commit was created and pushed:

- **Commit:** `checkpoint: pre-capacitor-integration (TOP v0.3)` (e.g. `de69e85` on branch `TOP_Volente_v0.3`)
- **Remote:** `origin` → `https://github.com/theoutreachprojectpodcast-ui/top-app-v2.git`

Restore that point if needed: `git checkout <commit>`.

## Phase 1 — Audit summary

| Item | Finding |
|------|---------|
| Framework | Next.js **16.2.1** (App Router, Turbopack in dev) |
| Production build | `pnpm run build` → output under **`.next/`** (Node server; **not** a static `out/` tree) |
| `index.html` at repo root | **No** — Next is SSR/ISR + API routes |
| Routing | App Router (`src/app`), client navigation as usual |
| Asset base | Default `/` — public files under `public/` |
| Env vars | `.env.local` (e.g. WorkOS, Supabase, Stripe) — **server-side** for secrets |
| WorkOS | AuthKit Next.js, `/callback`, cookies — **must allow your WebView origin** (see caveats) |
| Supabase | Client + service routes from Next API |
| Stripe | API routes + webhooks — requires **HTTPS** origin in production |
| Browser-only assumptions | Minimal; native uses the **same** UI loaded from a URL |
| Dev commands | `pnpm dev` → **localhost:3000**; `pnpm dev:alt` → **localhost:3001** |
| Start prod locally | `pnpm start` (after `pnpm build`) |

**Why `webDir` is not `.next`:** Capacitor expects static web assets. This app relies on **Next Route Handlers** and dynamic rendering, so the native wrapper loads the **real Next deployment** via `server.url` (see below).

## Phase 2–3 — What was installed

Inside **`web/`** (the Next app root):

- **Dependencies:** `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/share`
- **Config:** `capacitor.config.js` (CommonJS — required for Capacitor CLI)
- **Static shell:** `capacitor-www/index.html` (fallback copy when no `CAP_SERVER_URL`)
- **Platforms:** `web/android/`, `web/ios/` (generated; safe to commit — build cruft is gitignored)

**App identity (update when branding is final):**

- **appId / bundle id:** `org.theoutreachproject.top`
- **appName:** `The Outreach Project`

## Phase 5 — Scripts (`web/package.json`)

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Next dev server (**port 3001**) |
| `pnpm dev:alt` | Next dev server (**port 3000**) |
| `pnpm run build` | Next production build |
| `pnpm start` | Next production server |
| `pnpm run cap:sync` / `pnpm run mobile:sync` | Copy `capacitor-www` + config into native projects |
| `pnpm run cap:open:android` / `mobile:open:android` | Open Android Studio |
| `pnpm run cap:open:ios` / `mobile:open:ios` | Open Xcode (**macOS only**) |
| `pnpm run mobile:prep` | Same as `mobile:prep:prod` — builds web, syncs native, verifies embedded Production URL |
| `pnpm run mobile:prep:prod` | **TestFlight / App Store** — embeds `https://theoutreachproject.app` |
| `pnpm run verify:cap-server` | Fails if iOS/Android `capacitor.config.json` has localhost or missing `server.url` |

## Phase 6 — `CAP_SERVER_URL` (remote WebView origin)

**TestFlight / App Store:** `capacitor.config.js` **defaults to Production** (`https://theoutreachproject.app`) when `CAP_SERVER_URL` is unset. Always run `pnpm run mobile:prep:prod` before archiving in Xcode.

Override **`CAP_SERVER_URL`** only for local dev / QA (no trailing slash):

**Examples**

- Production (default): `https://theoutreachproject.app`
- QA native builds: `pnpm run mobile:prep:qa` → `https://qa.theoutreachproject.app`
- Android **emulator** → host machine: `http://10.0.2.2:3000` (with `pnpm dev` on port 3000)
- Physical device on LAN: `http://192.168.x.x:3000` (same Wi‑Fi; dev only)

Then from **`web/`**:

```bash
set CAP_SERVER_URL=https://your-production-host
pnpm exec cap sync
```

(PowerShell: `$env:CAP_SERVER_URL="..."; pnpm exec cap sync`)

- **`http://`** requires `cleartext: true` (set automatically when URL starts with `http://`).
- **Production** should use **HTTPS** to avoid mixed-content blocks for Stripe / WorkOS / Supabase.

### Auth / Stripe / Supabase caveats

1. **WorkOS redirect URIs** must include the **exact** origins you use in the WebView (production domain; for dev, the LAN or emulator URL if you test that way).
2. **Cookies / session** in WebView must match your cookie settings (Secure, SameSite). Prefer HTTPS for real sign-in tests.
3. **Stripe Checkout** return URLs must match `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` style configuration for that environment.
4. **Content Security Policy** — if you add CSP headers later, allow your API and third-party auth/payment domains inside the WebView.

## Phase 7 — Platform helpers (minimal)

- `web/src/lib/capacitor/platform.js` — `isCapacitorNative()`, `capacitorPlatform()`
- `web/src/lib/capacitor/share.js` — `shareContent()` (Capacitor Share → Web Share API → graceful no-op)

Import these only from **client** components; they are marked `"use client"`.

## Phase 8 — Sharing

`@capacitor/share` is installed and registered on both platforms. Use `shareContent()` when you add UX that should share links or text; web keeps first-class behavior via the Web Share API where available.

## Phase 9 — Icons / splash

Default Capacitor placeholders apply. Replace later with:

- `pnpm exec capacitor-assets` flow or manual assets (documented on [capacitorjs.com](https://capacitorjs.com/docs/guides/splash-screens-and-icons))

## Phase 11 — iOS on a Mac (next steps)

**Full walkthrough:** [../../docs/IOS_XCODE_SETUP.md](../../docs/IOS_XCODE_SETUP.md)

On **macOS** with **Xcode** installed:

```bash
cd web
pnpm install
pnpm exec cap sync
pnpm exec cap open ios
```

Then build/run from Xcode. **Capacitor 8** uses **Swift Package Manager** for plugins (`Package.swift` under `ios/App`); CocoaPods is not required for the default template.

Prerequisites:

- Xcode + Command Line Tools
- Apple Developer account (for device / TestFlight / App Store)

## Phase 12 — Android (current environment)

```bash
cd web
pnpm exec cap open android
```

Use **Android Studio** to sync Gradle and run on an emulator or device. For emulator → host Next dev: `CAP_SERVER_URL=http://10.0.2.2:3001` then `pnpm exec cap sync`.

## Keeping native projects fresh

After **any** change under `capacitor-www/` or `capacitor.config.js`, or when changing `CAP_SERVER_URL`:

```bash
cd web
pnpm exec cap sync
```

Changing only Next **source** (no static shell change) still requires **redeploying** the Next app at `CAP_SERVER_URL`; then reload the WebView (or restart the app).

## Phase 14 — Verification checklist

- [x] `pnpm run build` succeeds (Next unchanged)
- [x] `pnpm exec cap sync` succeeds
- [x] `android/` and `ios/` exist and include `@capacitor/share`
- [ ] `pnpm dev:alt` on **localhost:3000** — run locally when convenient
- [ ] Sign-in / billing in WebView — test with real `CAP_SERVER_URL` + HTTPS

## Node version note

`@capacitor/cli` declares **Node ≥ 22**. If `cap` commands fail on Node 20, upgrade Node for mobile tooling only or align the repo `engines` field with your CI.

## See also

- [../../docs/MOBILE_READINESS.md](../../docs/MOBILE_READINESS.md) — build workflow, scripts, store checklist
- [../../docs/MOBILE_ARCHITECTURE_GAPS.md](../../docs/MOBILE_ARCHITECTURE_GAPS.md) — feature matrix, plugins, compliance gaps
- [../../docs/connecting-web-mobile-to-legacy-api.md](../../docs/connecting-web-mobile-to-legacy-api.md) — how web + Capacitor connect to the legacy App Store Supabase client vs Next `/api/*`
- [../../docs/mvp-production-launch.md](../../docs/mvp-production-launch.md) §9 — store submission checklist
