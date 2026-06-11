# Mobile launch checklist — Capacitor (iOS & Android)

Single checklist for store submission. **Web production launch** ([mvp-production-launch.md](./mvp-production-launch.md) §1–7) is separate and should pass first.

**Guides:** [MOBILE_READINESS.md](./MOBILE_READINESS.md) · [MOBILE_ARCHITECTURE_GAPS.md](./MOBILE_ARCHITECTURE_GAPS.md) · [IOS_XCODE_SETUP.md](./IOS_XCODE_SETUP.md) (Mac) · [ANDROID_STUDIO_SETUP.md](./ANDROID_STUDIO_SETUP.md) (Windows) · [web/docs/CAPACITOR_MOBILE.md](../web/docs/CAPACITOR_MOBILE.md) · [store-listing-copy.md](./store-listing-copy.md)

**Status snapshot:** 2026-06-09 — Production login verified on iOS; Capacitor synced to `https://theoutreachproject.app/mobile`. **Next:** iOS Archive → TestFlight; Android keystore + signed AAB → Play internal testing.

**App ID:** `org.theoutreachproject.torp` · **Production WebView URL:** `https://theoutreachproject.app/mobile`

**Store checklists:** [IOS_APP_STORE_RELEASE_CHECKLIST.md](../IOS_APP_STORE_RELEASE_CHECKLIST.md) · [ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md](../ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md)

---

## Progress summary

| Phase | Status |
|-------|--------|
| A — Repo & Capacitor setup | Done |
| B — Web production prerequisite | **Done** (MVP §1–7; §8 admin QA skipped) |
| C — Native prep & device smoke | **In progress** — login OK; billing/photos smoke remaining |
| D — iOS App Store | **Ready to archive** — install Xcode iOS platform, then TestFlight |
| E — Google Play | **Ready for AAB** — generate keystore, upload to internal testing |
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
- [x] `CAP_SERVER_URL=https://theoutreachproject.app` + `cap sync` — passed (2026-06-08)
- [ ] Commit/push mobile prep changes to `main` (if not already deployed)

---

## B. Web production prerequisite (before store review)

Complete [mvp-production-launch.md](./mvp-production-launch.md) §1–7 first (§8 admin QA **skipped**). Mobile WebView loads Production URL.

- [x] Production deploy green on `https://theoutreachproject.app`
- [x] WorkOS Production: `https://theoutreachproject.app/callback` registered
- [x] Browser sign-in / sign-out verified
- [x] Stripe live checkout + webhook **200** (test purchase)
- [x] `GET /api/auth/status` → `demoFlowsEnabled: false`, `adminEmailLogin: false`
- [x] `/privacy`, `/terms`, `/contact` live for stores
- [x] Legal URLs return **200** (automated smoke 2026-06-04)

---

## C. Tooling & native prep

### C.1 Accounts & tools

- [x] Apple Developer Program enrolled
- [x] Google Play Console account
- [ ] **macOS + Xcode** installed (iOS builds)
- [x] **Android Studio** installed (2026.1.1.8 via winget) — complete SDK setup + `adb` on PATH per [ANDROID_STUDIO_SETUP.md](./ANDROID_STUDIO_SETUP.md)
- [x] Node **≥ 22** for Capacitor CLI — verified **v22.22.0** (2026-06-08)
- [x] `pnpm install` at repo root

### C.2 Sync before each native release

- [x] Run `pnpm run mobile:store:prep` (or `mobile:prep:prod`)
- [x] Confirm embedded server URL = `https://theoutreachproject.app/mobile` in native config (after sync)

### C.3 Automated checks (repeatable)

- [x] `pnpm --dir web run validate:capacitor` (2026-06-08)
- [x] `pnpm --dir web run build` (via `mobile:prep:prod`, 2026-06-08)
- [ ] `pnpm --dir web run lint`
- [ ] `pnpm --dir web run smoke:routes`
- [x] `pnpm --dir web run smoke:qa:http https://theoutreachproject.app` (includes `/privacy`, `/terms` — 2026-06-08)
- [x] Android `gradlew assembleDebug` succeeds (set `JAVA_HOME` to Android Studio `jbr`)

### C.4 Store assets (both platforms)

- [x] **iOS app icon** — `pnpm --dir web run mobile:icons` (from `public/icon-1024.png`)
- [ ] **Android launcher icons** — Android Studio Image Asset or `pnpm --dir web run mobile:assets`
- [x] Branded **splash** screens — `pnpm --dir web run mobile:splash` (brand mark on `#F5F7F6`; iOS LaunchScreen + Android drawables)
- [ ] Phone **screenshots** (tablet / Play feature graphic optional)
- [ ] Reviewer WorkOS test account — see [store-policy-forms.md](./store-policy-forms.md)
- [x] Version **1.0 / build 1** for first upload (iOS + Android gradle/Xcode)

---

## D. Device smoke (iOS + Android WebView)

Test on **physical devices** after native builds run.

### D.1 Auth & session

- [x] WorkOS redirect URI includes production callback
- [x] `WORKOS_COOKIE_DOMAIN=theoutreachproject.app` on Vercel
- [ ] Sign in / sign out (iOS WebView) — **verified 2026-06-09**
- [ ] Sign in / sign out (Android WebView) — verify on internal-testing build
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
- [ ] Review notes state: **subscriptions via website (Stripe), no native IAP SKU** — see [MOBILE_WEB_ACCOUNT_FLOW.md](./MOBILE_WEB_ACCOUNT_FLOW.md)

### D.4 Mobile UX

- [ ] Safe areas (notch, home indicator) — footer dock, modals
- [ ] Keyboard does not cover form fields
- [ ] Modals / drawers scroll correctly
- [ ] Touch targets feel usable (44px min on native WebView)
- [ ] No demo-only UI (“Reset demo”, etc.) on Production

---

## E. iOS — App Store (requires Mac + Xcode)

**Full walkthrough:** [IOS_APP_STORE_RELEASE_CHECKLIST.md](../IOS_APP_STORE_RELEASE_CHECKLIST.md) · [IOS_XCODE_SETUP.md](./IOS_XCODE_SETUP.md)

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

**Full walkthrough:** [ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md](../ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md) · [ANDROID_STUDIO_SETUP.md](./ANDROID_STUDIO_SETUP.md)

### F.1 Play Console app record

- [ ] Create app — **The Outreach Project**
- [ ] Complete Dashboard setup tasks / policies

### F.2 Signing & AAB

- [ ] Play App Signing enabled
- [ ] Upload keystore generated (`web/android/keystore.properties.example` → `keystore.properties`)
- [ ] `pnpm run mobile:android:bundle` → `app-release.aab`
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
| 1 | Production web stable (§B) | [x] |
| 2 | `mobile:prep:prod` before each native build | [x] |
| 3 | Device smoke §D (auth, checkout, uploads) | [ ] |
| 4 | Store policy forms + reviewer account | [ ] |
| 5 | Signed release build (not debug QA URL) | [ ] |
| 6 | Icons/splash not placeholders (or accepted for v1) | [x] splash script |

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
