# Mobile architecture gaps — Capacitor iOS & Android

Audit of **The Outreach Project** for App Store and Google Play readiness. Complements [MOBILE_READINESS.md](./MOBILE_READINESS.md).

**Legend**

| Status | Meaning |
|--------|---------|
| ✅ Works now | Expected to work in browser + Capacitor WebView without native code |
| 🟡 Mobile adjust | Works but needs WebView testing or minor CSS/UX |
| 🔌 Native plugin | Needs Capacitor/Cordova plugin or native config |
| 🌐 Backend | Needs API, env, CORS, or redirect change |
| 🔐 Auth/arch | Session, cookie, or redirect architecture |
| 🏪 Store compliance | App Review / Play policy decision |
| ⛔ Blocked | Not buildable on mobile with current architecture |

---

## Completed Capacitor setup

| Item | Status |
|------|--------|
| `@capacitor/core`, `cli`, `ios`, `android` ^8.3 | ✅ Installed |
| `@capacitor/share` | ✅ Installed |
| `capacitor.config.js` (appId, webDir, server.url, allowNavigation) | ✅ |
| `web/ios`, `web/android` projects | ✅ Present |
| `capacitor-www` fallback shell | ✅ |
| Scripts: `mobile:prep:prod`, `mobile:prep:qa`, `mobile:prep:url`, `validate:capacitor` | ✅ |
| `CapacitorNativeShell` + `capacitor-native.css` | ✅ Added |
| Next `viewport` `viewportFit: cover` | ✅ Added |
| iOS photo/camera usage strings in `Info.plist` | ✅ Added |
| Placeholder app icon + splash (Capacitor defaults) | ✅ Present — replace before store marketing |

**Not using `capacitor.config.ts`:** CLI loads `capacitor.config.js` without extra tooling (documented in MOBILE_READINESS).

---

## Stack audit (web compatibility)

| Area | Finding | Mobile impact |
|------|---------|---------------|
| Framework | Next.js 16 App Router | ⛔ Cannot static-export into `webDir`; **remote URL** architecture is correct |
| Routing | Client + server routes | ✅ Same URLs in WebView |
| Auth | WorkOS AuthKit, iron-session cookies | 🔐 Must test WebView redirects; cookie domain `.app` |
| API | Next Route Handlers `/api/*` | ✅ Same origin when `CAP_SERVER_URL` = deployed app |
| Storage | Cookies (session), `localStorage` (demo/fallback only) | ✅ Demo off in Production |
| Payments | Stripe Checkout (hosted pages) | 🏪 Web billing; store compliance note below |
| Maps / geolocation | Not a core dependency | ✅ N/A |
| Background tasks | None | ✅ N/A |
| Third-party SDKs | WorkOS, Stripe, Supabase (HTTPS) | 🟡 `allowNavigation` configured |

### Browser-only APIs reviewed

| API / pattern | Usage | Web | iOS Capacitor | Android Capacitor |
|---------------|-------|-----|---------------|-------------------|
| `window`, `document` | UI | ✅ | ✅ | ✅ |
| `localStorage` | Demo profile, trusted app fallback | ✅ (demo off prod) | ✅ | ✅ |
| `navigator.share` | Via `shareContent()` | ✅ | ✅ (+ Capacitor Share) | ✅ |
| `<input type="file" accept="image/*">` | Avatar, community photo | ✅ | 🟡 Test on device; iOS plist strings added |
| `getUserMedia` / camera | Not used directly | — | 🔌 If added later |
| `Notification` (Web Push) | Not used | — | 🔌 Future |
| `window.open` / new tab | Rare; Stripe/WorkOS use navigation | ✅ | 🟡 Prefer same WebView |
| Service worker / PWA | Manifest linked | ✅ | 🟡 Limited in WebView |
| `iframe` embeds | Minimal | ✅ | 🟡 |

---

## Feature compatibility matrix

| Feature | Web browser | iOS Capacitor | Android Capacitor | Notes |
|---------|-------------|---------------|-------------------|-------|
| Home, directory, trusted, sponsors | ✅ | 🟡 | 🟡 | Responsive CSS; verify scroll + dock |
| Community feed | ✅ | 🟡 | 🟡 | |
| Community post + image upload | ✅ | 🟡 | 🟡 | File input; no `@capacitor/camera` yet |
| Podcasts / YouTube embeds | ✅ | 🟡 | 🟡 | Test playback in WebView |
| Profile view/edit | ✅ | 🟡 | 🟡 | |
| Profile avatar upload | ✅ | 🟡 | 🟡 | `POST /api/me/avatar` |
| Onboarding | ✅ | 🟡 | 🟡 | |
| WorkOS sign-in / sign-out | ✅ | 🔐 | 🔐 | Manual device test required |
| `/api/me`, session cookies | ✅ | 🔐 | 🔐 | `WORKOS_COOKIE_DOMAIN` |
| Membership Stripe checkout | ✅ | 🔐 🏪 | 🔐 🏪 | Hosted Checkout; disclose web billing to stores |
| Billing portal / invoices | ✅ | 🟡 | 🟡 | |
| Sponsor / trusted applications | ✅ | 🟡 | 🟡 | |
| Admin console (`admin.*` host) | ✅ | 🟡 | 🟡 | Separate host; optional for mobile v1 |
| In-app notifications list | ✅ | 🟡 | 🟡 | Poll/API — not push |
| Share link (native sheet) | ✅ | ✅ | ✅ | `shareContent()` — wire in UI when needed |
| Deep links (`torp://`, universal links) | ⛔ | ⛔ | ⛔ | Not configured |
| Push notifications | ⛔ | ⛔ | ⛔ | Documented only |
| Offline mode | ⛔ | ⛔ | ⛔ | Requires network for Next remote URL |
| Demo flows | Off prod | ✅ off | ✅ off | `demoFlowsEnabled: false` on prod API |
| Maps | — | — | — | Not used |
| Audio/video recording | — | — | — | Not used |

---

## Required capability checks

| Capability | Status | Action |
|------------|--------|--------|
| Auth in WebView | 🔐 | Test WorkOS on physical iOS/Android; confirm callback URL |
| Deep links / app links | ⛔ | Add Associated Domains (iOS) + intent filters (Android); optional `@capacitor/app` |
| Camera / photo picker | 🟡 | HTML file input; iOS usage strings added; test before submit |
| Video upload | ⛔ | No video upload flow in app today |
| Session persistence | 🔐 | Cookie-based; test cold start after sign-in |
| API QA vs Production | ✅ | Change `CAP_SERVER_URL` only — no secrets in native |
| CORS | ✅ | Same-origin WebView to deployed Next |
| Push notification readiness | 📄 | See MOBILE_READINESS §10 |
| Stripe web checkout | ✅ 🏪 | Works in WebView; **not** Apple/Google IAP |
| Native IAP | ⛔ | Not implemented — flag if store requires for digital subs |
| Offline / error states | 🟡 | Network errors show Next UI; no offline cache |
| Responsive phone/tablet | ✅ | Existing CSS |
| Safe areas / keyboard | 🟡 | `safe-area` + `capacitor-native.css`; test modals/forms on device |
| WebView performance | 🟡 | Manual profiling on mid-range devices |

---

## Store compliance (digital subscriptions)

| Topic | Current architecture | Risk | Recommendation |
|-------|---------------------|------|----------------|
| Membership (Support / Pro) | Stripe Checkout on web | 🏪 Apple Guideline 3.1.1 / Play billing policies | In review notes: subscription completed on **website**; no IAP SKU. If rejected, evaluate IAP or “reader/login” positioning with counsel |
| Sponsor paid tiers | Stripe (partial env) | 🏪 Same | Same disclosure |
| Physical goods / donations | N/A | Low | — |

**Do not** embed Stripe in a way that hides external payment from reviewers if your tier is considered digital content consumed in-app.

---

## Features requiring native plugins (future)

| Feature | Plugin / work |
|---------|----------------|
| Universal / app links | `@capacitor/app` + iOS Associated Domains + Android App Links |
| Push notifications | `@capacitor/push-notifications` + FCM + APNs + server |
| Native camera UX | `@capacitor/camera` (optional; file input may suffice) |
| Biometric unlock | `@capacitor/preferences` + local auth plugin |
| Status bar / splash control | `@capacitor/status-bar`, `@capacitor/splash-screen` |
| File download to device | `@capacitor/filesystem` |

---

## Features requiring backend / env changes

| Item | Notes |
|------|-------|
| WorkOS redirect URIs | Add any test origins (LAN) if used for dev |
| Stripe return URLs | Must match `APP_BASE_URL` per environment |
| `NEXT_PUBLIC_*` on Vercel | Redeploy after changes; affects WebView loaded URL |
| Admin on `admin.theoutreachproject.app` | Optional separate mobile testing |

---

## Blocked by current architecture

| Item | Why | Mitigation |
|------|-----|------------|
| Fully offline app | Remote `server.url` | None for v1; acceptable for WebView shell |
| Bundled static-only IPA | Next needs server | Keep remote URL (current design) |
| In-app digital IAP | Not built | Store policy or IAP project |
| Native deep link to `/callback` | No entitlements | Phase 2 |

---

## Recommended next steps (before store submission)

1. **Run** `pnpm --dir web run mobile:prep:prod` on Mac or CI, then open Xcode/Android Studio.
2. **Device smoke:** sign-in, profile save, avatar upload, community post, membership checkout (test mode or small live charge).
3. **Replace** placeholder icon/splash (`capacitor-assets` or design exports).
4. **Bump** `versionCode` / build number for each upload.
5. **App Store Connect / Play Console:** privacy URLs, test account, web-billing disclosure.
6. **Optional:** wire `shareContent()` on share actions (community, sponsors).
7. **Phase 2:** universal links for `/callback` and marketing links.
8. **Phase 2:** push notifications if product requires native alerts.

---

## Test run log (automated — 2026-06-04)

| Command | Result |
|---------|--------|
| `pnpm --dir web run validate:capacitor` | **Passed** |
| `pnpm --dir web run build` | **Passed** (Next 16.2.1) |
| `pnpm --dir web run lint` | **Passed** (0 errors, 17 pre-existing warnings) |
| `pnpm --dir web run smoke:routes` | **Passed** (27 routes) |
| `CAP_SERVER_URL=https://theoutreachproject.app pnpm exec cap sync` | **Passed** (iOS + Android, `@capacitor/share`) |
| `pnpm --dir web run cap:open:ios` | **Not run** — requires macOS + Xcode |
| `pnpm --dir web run cap:open:android` | **Not run** — open Android Studio manually |
| Xcode archive / TestFlight | **Manual** |
| Play signed AAB / internal track | **Manual** |
| Physical device auth/billing | **Manual** |

---

*This document should be updated after each store rejection or major native change.*
