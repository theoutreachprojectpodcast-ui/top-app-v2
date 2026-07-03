# Mobile readiness — Capacitor (iOS & Android)

Production-oriented guide for shipping **The Outreach Project** as native shells that load the **live Next.js** deployment. The web app is unchanged; native projects are a thin WebView wrapper.

**Related:** [MOBILE_LAUNCH_CHECKLIST.md](./MOBILE_LAUNCH_CHECKLIST.md) (all todos) · [MOBILE_ARCHITECTURE_GAPS.md](./MOBILE_ARCHITECTURE_GAPS.md) · [web/docs/CAPACITOR_MOBILE.md](../web/docs/CAPACITOR_MOBILE.md) · [mvp-production-launch.md](./mvp-production-launch.md) §9

---

## 1. Architecture summary

| Layer | Technology |
|-------|------------|
| Web app | **Next.js 16** (App Router), React 19, API routes (`/api/*`) |
| Auth | **WorkOS AuthKit** (`/callback`, cookies on `theoutreachproject.app`) |
| Data | **Supabase** (server + client); profile table `top_profiles` in Production |
| Payments | **Stripe** hosted Checkout + Customer Portal (web); webhooks on Vercel |
| Deploy | **Vercel** — Production `https://theoutreachproject.app` |
| Mobile | **Capacitor 8** — `web/ios`, `web/android`, remote `server.url` |

**Important:** Capacitor `webDir` is `capacitor-www/` (static fallback). The real app is **not** bundled into the IPA/AAB. Native builds load `CAP_SERVER_URL` (Production or QA HTTPS). This preserves SSR, API routes, and one deployment pipeline.

---

## 2. Capacitor identity

| Field | Value |
|-------|--------|
| appId / bundle ID | `org.theoutreachproject.top` |
| Display name | The Outreach Project |
| Config file | `web/capacitor.config.js` |
| Fallback web assets | `web/capacitor-www/` |
| iOS project | `web/ios/` |
| Android project | `web/android/` |

Config is **JavaScript** (not `capacitor.config.ts`) so the Capacitor CLI runs without a TypeScript loader.

---

## 3. Environment URLs (no secrets in native projects)

Set **`CAP_SERVER_URL`** only when running `cap sync` (local shell env — never commit):

| Environment | Example `CAP_SERVER_URL` |
|-------------|---------------------------|
| Production | `https://theoutreachproject.app` |
| QA | `https://qa.theoutreachproject.app` or Preview Vercel URL |
| Android emulator → host dev | `http://10.0.2.2:3001` (host `localhost:3001`) |
| Physical device → LAN dev | `http://192.168.x.x:3001` |

All WorkOS, Supabase, and Stripe secrets stay on **Vercel** / server env — not in Xcode or Gradle.

---

## 4. Scripts

From **repo root**:

```bash
pnpm install
pnpm --dir web run validate:capacitor   # structure check (CI-safe)
pnpm --dir web run mobile:prep:prod     # build + sync → Production URL
pnpm --dir web run mobile:prep:qa       # build + sync → QA URL
pnpm --dir web run cap:open:ios         # macOS + Xcode only
pnpm --dir web run cap:open:android     # Android Studio
```

From **`web/`**:

| Script | Action |
|--------|--------|
| `pnpm run build` | Next production build (unchanged) |
| `pnpm run mobile:prep` | `build` + `cap sync` (no `CAP_SERVER_URL` unless set) |
| `pnpm run mobile:prep:prod` | Production URL + build + sync |
| `pnpm run mobile:prep:qa` | QA URL + build + sync |
| `pnpm run mobile:prep:url -- https://…` | Custom origin + build + sync |
| `pnpm run cap:sync` | Refresh native projects after config / `capacitor-www` changes |
| `pnpm run validate:capacitor` | Verify ios/android/config exist |

**Node:** Capacitor CLI recommends **Node ≥ 22**. Repo `engines` allow ≥ 20 for Next; use Node 22+ for `cap` if CLI warns.

---

## 5. Repeatable build & test workflow

### 5.1 One-time prerequisites

- [ ] Production web live (§7 in [mvp-production-launch.md](./mvp-production-launch.md))
- [ ] Apple Developer + Google Play Console (you have accounts)
- [ ] macOS + **Xcode** (iOS device, simulator, archive, TestFlight)
- [x] **Android Studio** installed — finish [ANDROID_STUDIO_SETUP.md](./ANDROID_STUDIO_SETUP.md), then emulator/AAB
- [ ] `pnpm install` at repo root

### 5.2 Before each native release build

```bash
pnpm --dir web run mobile:prep:prod
```

Confirm in Xcode/Android Studio that the embedded server URL is `https://theoutreachproject.app` (Capacitor copies config at sync time).

### 5.3 iOS simulator (Mac)

```bash
cd web
pnpm exec cap open ios
```

Xcode → select simulator → Run. Sign in with WorkOS (requires network; cookies on `.app` domain).

### 5.4 Android emulator

```bash
# Optional: point at local Next dev
$env:CAP_SERVER_URL="http://10.0.2.2:3001"   # PowerShell
pnpm exec cap sync
pnpm exec cap open android
```

For Production WebView testing, use `mobile:prep:prod` instead.

### 5.5 Physical devices

- Same Wi‑Fi as dev machine when using LAN `CAP_SERVER_URL`
- Production testing: always use **HTTPS** `mobile:prep:prod`
- WorkOS redirect URI must include the origin users actually load (Production domain)

### 5.6 Store builds

| Platform | Version location |
|----------|------------------|
| iOS | Xcode → `MARKETING_VERSION`, build number in `web/ios/App/App.xcodeproj` |
| Android | `web/android/app/build.gradle` → `versionCode`, `versionName` |

Replace placeholder icons/splash before public store listing ([Capacitor assets guide](https://capacitorjs.com/docs/guides/splash-screens-and-icons)).

---

## 6. WorkOS, Stripe, and cookies in WebView

1. Register **`https://theoutreachproject.app/callback`** in WorkOS Production.
2. Set `WORKOS_COOKIE_DOMAIN=theoutreachproject.app` on Vercel Production.
3. Stripe Checkout return URLs must match `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` for that environment.
4. `capacitor.config.js` sets `allowNavigation` for WorkOS and Stripe hosts when `CAP_SERVER_URL` is set.
5. Test **sign-in, sign-out, profile, membership checkout** on a **physical device** — not only desktop browser.

---

## 7. Mobile UI (web layer)

Already in place:

- Responsive layouts + `mobile-shell.css` / `mobile-design-system.css`
- `env(safe-area-inset-*)` on header, footer dock, modals
- `viewport-fit: cover` via Next `viewport` export in `layout.js`
- Capacitor-only tweaks: `capacitor-native.css` + `CapacitorNativeShell` (`data-capacitor-native` on `<html>`)

No duplicate mobile-only routes were added.

---

## 8. Store policy (membership / payments)

- Digital membership is sold via **Stripe on the web** inside the WebView (same as mobile browser).
- **Apple / Google IAP** are **not** implemented. For store review, document in App Privacy / Data safety that subscriptions are completed on your website (Stripe), not via native IAP SKUs.
- If stores require IAP for in-app digital subscriptions, that is a **product/legal** decision — see [MOBILE_ARCHITECTURE_GAPS.md](./MOBILE_ARCHITECTURE_GAPS.md).

---

## 9. Deep links & universal links (not yet configured)

Custom URL schemes / Universal Links / App Links for `/callback`, password reset, and shared content are **not** wired in native projects yet. Auth today relies on HTTPS navigation inside the WebView. See gap report for recommended plugins and entitlements.

---

## 10. Push notifications

**Not implemented.** In-app notifications use your existing API (`/notifications`). Native push requires `@capacitor/push-notifications` + FCM/APNs + backend — documented as future work.

---

## 11. Verification checklist

| Check | Command / action |
|-------|------------------|
| Web build | `pnpm --dir web run build` |
| Lint | `pnpm --dir web run lint` |
| Route smoke | `pnpm --dir web run smoke:routes` |
| Capacitor structure | `pnpm --dir web run validate:capacitor` |
| Cap sync | `CAP_SERVER_URL=https://theoutreachproject.app pnpm --dir web exec cap sync` |
| Production HTTP | `pnpm --dir web run smoke:qa:http https://theoutreachproject.app` |
| Native IDE | Xcode / Android Studio manual run |

---

## 12. Manual validation only (cannot run in CI here)

- [ ] iOS archive → App Store Connect upload
- [ ] Android signed AAB → Play Console upload
- [ ] TestFlight / internal testing track
- [ ] WorkOS sign-in inside iOS WebView
- [ ] WorkOS sign-in inside Android WebView
- [ ] Stripe live/test checkout return to app
- [ ] Profile photo `<input type="file">` on physical devices
- [ ] Community photo upload on physical devices
- [ ] App Store Connect privacy questionnaire
- [ ] Play Console Data safety form

---

## 13. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Native app shows dark “CAP_SERVER_URL” page | Run `mobile:prep:prod` with `CAP_SERVER_URL` set, then reinstall |
| Sign-in redirect error | Add exact origin + `/callback` to WorkOS; redeploy Vercel after `NEXT_PUBLIC_*` changes |
| Stripe blocked | Use HTTPS `CAP_SERVER_URL`; check mixed content |
| `cap` fails on Node 20 | Use Node 22+ for Capacitor CLI |
| iOS build only on Mac | Expected — open `web/ios` on macOS |

---

*Last updated: 2026-06-04 — Capacitor 8.3, Next 16.2, remote WebView architecture.*
