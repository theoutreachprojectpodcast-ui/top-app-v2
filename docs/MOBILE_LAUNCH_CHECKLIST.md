# Mobile launch checklist — Capacitor (iOS & Android)

Single checklist for store submission. **Web production launch** ([mvp-production-launch.md](./mvp-production-launch.md) §1–7) is separate and should pass first.

**Guides:** [MOBILE_READINESS.md](./MOBILE_READINESS.md) · [MOBILE_ARCHITECTURE_GAPS.md](./MOBILE_ARCHITECTURE_GAPS.md) · [web/docs/CAPACITOR_MOBILE.md](../web/docs/CAPACITOR_MOBILE.md) · [store-listing-copy.md](./store-listing-copy.md)

**Status snapshot:** 2026-06 — Capacitor configured; **Android Studio + SDK installed** on dev machine. Optional: add `adb` to Path; create emulator; signed AAB for Play.

**App ID:** `org.theoutreachproject.torp` · **Production WebView URL:** `https://theoutreachproject.app`

---

## Progress summary

| Phase | Status |
|-------|--------|
| A — Repo & Capacitor setup | Mostly done |
| B — Web production prerequisite | In progress (see MVP launch doc) |
| C — Native prep & device smoke | Not started |
| D — iOS App Store | Not started (needs Mac + Xcode) |
| E — Google Play | SDK ready — emulator + signed AAB remaining |
| F — Post-launch / phase 2 | Not started |

---

## A. Repo & Capacitor setup (in codebase)

- [x] `@capacitor/core`, `cli`, `ios`, `android`, `share` installed (`web/package.json`)
- [x] `web/capacitor.config.js` — appId, webDir, `CAP_SERVER_URL` / `allowNavigation`
- [x] `web/ios/` and `web/android/` native projects present
- [x] `web/capacitor-www/` fallback shell
- [x] Scripts: `mobile:prep:prod`, `mobile:prep:qa`, `mobile:prep:url`, `validate:capacitor`, `cap:open:*`
- [x] `CapacitorNativeShell` + `capacitor-native.css` + `viewport-fit: cover`
- [x] iOS `Info.plist` photo/camera usage strings
- [x] Docs: `MOBILE_READINESS.md`, `MOBILE_ARCHITECTURE_GAPS.md`
- [x] `pnpm --dir web run validate:capacitor` — passed
- [x] `pnpm --dir web run build` — passed
- [x] `CAP_SERVER_URL=https://theoutreachproject.app` + `cap sync` — passed
- [ ] Commit/push mobile prep changes to `main` (if not already deployed)

---

## B. Web production prerequisite (before store review)

Complete [mvp-production-launch.md](./mvp-production-launch.md) §1–7 first. Mobile WebView loads this URL.

- [ ] Production deploy green on `https://theoutreachproject.app`
- [ ] WorkOS Production: `https://theoutreachproject.app/callback` registered
- [ ] Browser sign-in / sign-out verified
- [ ] Stripe live checkout + webhook **200** (one test purchase)
- [ ] `GET /api/auth/status` → `demoFlowsEnabled: false`, `adminEmailLogin: false`
- [ ] `/privacy`, `/terms`, `/contact` correct for stores
- [x] Legal URLs return **200** (automated smoke 2026-06-04)

---

## C. Tooling & native prep

### C.1 Accounts & tools

- [x] Apple Developer Program enrolled
- [x] Google Play Console account
- [ ] **macOS + Xcode** installed (iOS builds)
- [x] **Android Studio** installed (2026.1.1.8 via winget) — complete SDK setup + `adb` on PATH per [ANDROID_STUDIO_SETUP.md](./ANDROID_STUDIO_SETUP.md)
- [ ] Node **≥ 22** for Capacitor CLI (or confirm `cap` works on current Node)
- [ ] `pnpm install` at repo root

### C.2 Sync before each native release

- [ ] Run `pnpm --dir web run mobile:prep:prod`
- [ ] Confirm embedded server URL = `https://theoutreachproject.app` in native config (after sync)

### C.3 Automated checks (repeatable)

- [ ] `pnpm --dir web run validate:capacitor`
- [ ] `pnpm --dir web run build`
- [ ] `pnpm --dir web run lint`
- [ ] `pnpm --dir web run smoke:routes`
- [ ] `pnpm --dir web run smoke:qa:http https://theoutreachproject.app`

### C.4 Store assets (both platforms)

- [ ] Replace placeholder **app icon** and **splash** ([Capacitor assets guide](https://capacitorjs.com/docs/guides/splash-screens-and-icons))
- [ ] Phone **screenshots** (tablet / Play feature graphic optional)
- [ ] Update [store-listing-copy.md](./store-listing-copy.md) — support email, reviewer test account
- [ ] Bump versions before each upload:
  - [ ] iOS: `MARKETING_VERSION` + build in `web/ios/App/App.xcodeproj`
  - [ ] Android: `versionName` + `versionCode` in `web/android/app/build.gradle`

---

## D. Device smoke (iOS + Android WebView)

Test on **physical devices** after native builds run.

### D.1 Auth & session

- [ ] WorkOS redirect URI includes production callback
- [x] `WORKOS_COOKIE_DOMAIN=theoutreachproject.app` on Vercel
- [ ] Sign in / sign out (iOS WebView)
- [ ] Sign in / sign out (Android WebView)
- [ ] Profile loads after **cold start**
- [ ] Session persists across app restarts

### D.2 Core product flows

- [ ] Home, Directory, Community, Profile tabs
- [ ] Sponsors / Trusted / Podcasts load
- [ ] Profile edit + **save**
- [ ] Onboarding complete path
- [ ] Profile photo upload (`<input type="file">`)
- [ ] Community post with image upload
- [ ] Contact / sponsor application submit
- [ ] Notifications list (in-app API — not push)

### D.3 Billing (store disclosure)

- [ ] Membership Stripe checkout completes on device
- [ ] Return from Checkout lands back in app/WebView
- [ ] Profile shows tier / billing after webhook
- [ ] Manage billing portal opens and returns
- [ ] Review notes state: **subscriptions via website (Stripe), no native IAP SKU**

### D.4 Mobile UX

- [ ] Safe areas (notch, home indicator) — footer dock, modals
- [ ] Keyboard does not cover form fields
- [ ] Modals / drawers scroll correctly
- [ ] Touch targets feel usable (44px min on native WebView)
- [ ] No demo-only UI (“Reset demo”, etc.) on Production

---

## E. iOS — App Store (requires Mac + Xcode)

### E.1 App Store Connect

- [ ] Create app — **The Outreach Project**, bundle `org.theoutreachproject.torp`
- [ ] SKU (e.g. `torp-ios-001`)
- [ ] Bundle ID exists in Apple Developer → Identifiers

### E.2 Build & TestFlight

- [ ] `pnpm --dir web run cap:open:ios`
- [ ] Signing & Capabilities — correct team, automatic signing
- [ ] **Product → Archive** → upload to App Store Connect
- [ ] TestFlight internal testers added
- [ ] TestFlight external beta (optional)
- [ ] Section **D** smoke on TestFlight build

### E.3 App Store submission

- [ ] Privacy Policy URL: `https://theoutreachproject.app/privacy`
- [ ] App Privacy questionnaire completed
- [ ] Age rating questionnaire
- [ ] Screenshots (6.7" + 6.5" iPhone minimum)
- [ ] Review notes: test account + WebView loads `theoutreachproject.app` + web billing note
- [ ] Export compliance answered
- [ ] Select build → **Add for Review** → submit

### E.4 After approval

- [ ] Release (manual or automatic)
- [ ] Monitor crashes / metrics in App Store Connect

---

## F. Android — Google Play

Android Studio is installed; finish SDK setup in [ANDROID_STUDIO_SETUP.md](./ANDROID_STUDIO_SETUP.md), then complete F.1–F.4 below (or use CI for AAB).

### F.1 Play Console app record

- [ ] Create app — **The Outreach Project**
- [ ] Complete Dashboard setup tasks / policies

### F.2 Signing & AAB

- [ ] Play App Signing enabled
- [ ] Upload keystore generated and stored securely
- [ ] `pnpm --dir web run cap:open:android`
- [ ] **Build → Generate Signed Bundle (AAB)**
- [ ] Upload AAB to internal testing track

### F.3 Store listing & policy

- [ ] Main listing (title, descriptions, icon 512×512, feature graphic 1024×500)
- [ ] Privacy policy URL
- [ ] App access / reviewer test credentials
- [ ] Content rating (IARC)
- [ ] Data safety form (account, web payment disclosure)
- [ ] Target audience

### F.4 Testing → Production

- [ ] Internal testing — team emails
- [ ] Closed/open testing (optional)
- [ ] Section **D** smoke on internal track
- [ ] Promote to **Production** → Google review
- [ ] 100% rollout after approval
- [ ] Monitor Android vitals

---

## G. Architecture gaps — phase 2 (not required for v1 shell)

Track in [MOBILE_ARCHITECTURE_GAPS.md](./MOBILE_ARCHITECTURE_GAPS.md).

- [ ] Universal Links (iOS) + App Links (Android) for `/callback` and marketing URLs
- [ ] `@capacitor/app` deep link handling
- [ ] Push notifications (`@capacitor/push-notifications` + FCM/APNs + backend)
- [ ] `@capacitor/camera` (only if HTML file input insufficient)
- [ ] Native IAP (only if App Store / Play require for digital subscriptions)
- [ ] Wire `shareContent()` on share actions in UI
- [ ] Offline / error UX improvements for poor network

---

## H. MVP mobile blockers (do not ship stores without)

| # | Item | Done? |
|---|------|-------|
| 1 | Production web stable (§B) | [ ] |
| 2 | `mobile:prep:prod` before each native build | [ ] |
| 3 | Device smoke §D (auth, checkout, uploads) | [ ] |
| 4 | Store policy forms + reviewer account | [ ] |
| 5 | Signed release build (not debug QA URL) | [ ] |
| 6 | Icons/splash not placeholders (or accepted for v1) | [ ] |

---

## Quick commands

```bash
pnpm --dir web run mobile:prep:prod
pnpm --dir web run validate:capacitor
pnpm --dir web run cap:open:ios        # Mac only
pnpm --dir web run cap:open:android    # opens Android Studio (after SDK setup)
```

---

*Update checkboxes as you complete items. Web launch checklist remains [mvp-production-launch.md](./mvp-production-launch.md).*
