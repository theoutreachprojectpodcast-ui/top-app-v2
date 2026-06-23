# Android / Google Play — status checklist

Living checklist for **The Outreach Project** Android app submission.  
Update checkboxes as items are completed.

**Android package name (Play Console / `applicationId`):** `com.theoutreachproject` — must match `web/android/app/build.gradle` `applicationId`.  
**iOS bundle ID / Capacitor `appId`:** `com.theoutreachproject.theoutreachproject` (unchanged; deep-link URL schemes use this id).

**Production WebView URL:** `https://theoutreachproject.app` (embedded in native config after `mobile:prep:prod`; app routes users into `/mobile` on load)

**Related guides:** [ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md](../ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md) · [ANDROID_STUDIO_SETUP.md](./ANDROID_STUDIO_SETUP.md) · [MOBILE_LAUNCH_CHECKLIST.md](./MOBILE_LAUNCH_CHECKLIST.md) · [store-listing-copy.md](./store-listing-copy.md) · [store-policy-forms.md](./store-policy-forms.md)

**Last updated:** 2026-06-19 (post–production push `6a96afc`)

---

## Recent activity (2026-06-19)

| Action | Result |
|--------|--------|
| Set `JAVA_HOME`, `ANDROID_HOME`, and user PATH (`jbr`, `platform-tools`, `emulator`) | Done — OpenJDK 21, `adb` works in new terminals |
| Installed Android SDK Command-line Tools (`commandlinetools-win-14742923`) | Done — `sdkmanager` v20.0 on PATH |
| Generated upload keystore + `keystore.properties` | Already present locally (gitignored) |
| Built signed AAB (`pnpm run mobile:android:bundle`) | Done — `app-release.aab` ~30 MB |
| Fixed `mobile:store:prep` failures | Done — `generate-mobile-icons.mjs` uses `python` on Windows; iOS/Android configs aligned |
| Verified `pnpm run mobile:store:prep` end-to-end | Passes (validate, build, icons, cap sync, `mobile:verify:prod`) |
| Production smoke (`smoke:production:http`, `smoke:routes`) | Passes — 2026-06-19 |
| Pushed release branch to production (`main` → `6a96afc`) | Done — Vercel production deploy + CI/Release Gates triggered |
| Play Console AAB upload blocked (package mismatch) | Fixed — `applicationId` → `com.theoutreachproject` to match Play app |
| Play Console internal testing upload | **Next** — rebuild AAB locally, then upload |

---

## Progress summary

| Area | Status |
|------|--------|
| Accounts & local tooling | **Done** |
| Codebase & Capacitor | Done |
| Web production prerequisite | Done (latest deploy `6a96afc`) |
| Signing & release build | **Done** — signed AAB ready; rebuild before upload if native assets changed |
| Play Console app record | **Created** — package `com.theoutreachproject` |
| Store listing & policy forms | Drafted in repo; not entered in console |
| Device smoke testing | Partial — login verified; most flows unchecked |
| Production release | **Not started** |

---

## 1. Prerequisites & accounts

### Done

- [x] Google Play Console developer account ($25 registration)
- [x] Android Studio installed (2026.1.1.8)
- [x] Android SDK installed (`%LOCALAPPDATA%\Android\Sdk`)
- [x] `adb` works (platform-tools on PATH)
- [x] `JAVA_HOME` → Android Studio `jbr` (OpenJDK 21) — set 2026-06-19
- [x] `ANDROID_HOME` → `%LOCALAPPDATA%\Android\Sdk` — set 2026-06-19
- [x] User PATH includes `jbr\bin`, `platform-tools`, `emulator`, `cmdline-tools\latest\bin`
- [x] **SDK Command-line Tools** installed — `sdkmanager` v20.0 (2026-06-19)
- [x] Node ≥ 22 for Capacitor CLI (v22.22.0 verified)
- [x] `pnpm install` at repo root

### Still to do

_(none in this section)_

---

## 2. Codebase & Capacitor (repo)

### Done

- [x] `@capacitor/core`, `cli`, `android`, `share` in `web/package.json`
- [x] Native Android project at `web/android/`
- [x] `web/capacitor.config.js` — `appId`, `webDir`, server URL, `allowNavigation`
- [x] `applicationId` = `com.theoutreachproject` (aligned with Play Console 2026-06-19)
- [x] Version **1.0** / `versionCode` **1** in `web/android/app/build.gradle`
- [x] Release signing wired in `build.gradle` (reads `keystore.properties` when present)
- [x] `keystore.properties.example` committed; real keystore gitignored
- [x] Launcher icons in `mipmap-*` densities
- [x] Branded splash screens (`mobile:splash`)
- [x] Scripts: `mobile:store:prep`, `mobile:android:bundle`, `mobile:prep:prod`, `validate:capacitor`
- [x] `pnpm run mobile:store:prep` passes (2026-06-19 — after Windows icon script + config sync fixes)
- [x] `mobile:verify:prod` — Android + iOS embedded URL = `https://theoutreachproject.app`
- [x] `generate-mobile-icons.mjs` fixed for Windows (`python` vs Store `python3` stub)
- [x] Mobile prep + Play docs pushed to `main` (`6a96afc`, 2026-06-19)
- [x] `gradlew assembleDebug` succeeds
- [x] Embedded config points at production origin after prod prep

### Still to do

- [x] Run `pnpm --dir web run lint` before final Play upload
- [x] Run `pnpm --dir web run smoke:routes` before final Play upload
- [x] Re-run `pnpm run mobile:android:bundle` before Play upload if icons/native assets changed since last AAB

---

## 3. Web production prerequisite

Must be stable before Play review — the app is a WebView shell over production.

### Done

- [x] Production deploy green at `https://theoutreachproject.app`
- [x] WorkOS Production callback registered
- [x] Browser sign-in / sign-out verified
- [x] Stripe live checkout + webhook **200**
- [x] `demoFlowsEnabled: false` on production
- [x] `/privacy`, `/terms`, `/contact` live (store-required URLs)
- [x] HTTP smoke passes (`smoke:qa:http` against production)
- [x] Latest production deploy from `main` (`6a96afc`, 2026-06-19) — includes self-service account deletion in Settings
- [x] Pre–Play Console production smoke (2026-06-19) — `smoke:production:http` all core + extended checks pass; `smoke:routes` OK (36 routes)

### Still to do

_(none — re-run before each new Play upload if production changed)_

---

## 4. Signing & release build

### Done

- [x] `keystore.properties.example` documents expected paths and aliases
- [x] Gradle `signingConfigs.release` configured
- [x] Upload keystore generated (`web/android/keystores/top-upload.keystore`)
- [x] `keystore.properties` configured (gitignored)
- [x] `pnpm run mobile:android:bundle` — signed AAB built 2026-06-19 (~30 MB)
- [x] Output confirmed: `web/android/app/build/outputs/bundle/release/app-release.aab`
- [x] Android Capacitor config synced to `https://theoutreachproject.app` (2026-06-19)

### Still to do

- [x] Store keystore passwords in team password manager (loss blocks updates) — **your action below**
- [x] Rebuild AAB after latest `mobile:store:prep` — done 2026-06-19 (`app-release.aab`, ~29.6 MB)
- [ ] Enroll in **Google Play App Signing** on first AAB upload (Play Console prompt) — **during Step 3 upload**

**Rebuild AAB before upload (recommended after 2026-06-19 prep):**

```powershell
pnpm run mobile:store:prep
pnpm run mobile:android:bundle
```

**First-time keystore (already done locally):**

```powershell
New-Item -ItemType Directory -Force -Path web\android\keystores
keytool -genkeypair -v -storetype PKCS12 `
  -keystore web\android\keystores\top-upload.keystore `
  -alias top-upload -keyalg RSA -keysize 2048 -validity 10000
Copy-Item web\android\keystore.properties.example web\android\keystore.properties
# Edit keystore.properties with real passwords, then:
pnpm run mobile:store:prep
pnpm run mobile:android:bundle
```

---

## 5. Play Console — app record

### Done

- [x] Play Console developer account exists

### Still to do

- [x] **Create app** in Play Console — name: **The Outreach Project** (app record exists with package `com.theoutreachproject`)
- [x] Package name: **`com.theoutreachproject`** (Play Console app created; cannot change later)
- [x] Complete dashboard setup tasks (developer account, payments profile if required, etc.)
- [x] Set default language and app category

---

## 6. Store listing & assets

Copy is drafted in repo; assets exist but are not yet uploaded to Play Console.

### Done

- [x] App name, short description, full description drafted — [store-listing-copy.md](./store-listing-copy.md)
- [x] App icon source (`web/public/icon-512.png`, `icon-1024.png`)
- [x] Screenshot assets in `docs/store-screenshots/` (SVG + some PNG exports)
- [x] Privacy policy URL: `https://theoutreachproject.app/privacy`
- [x] Support email documented: `support@theoutreachproject.app`

### Still to do

- [x] Enter main store listing in Play Console (title, short + full description)
- [x] Upload **512×512** app icon
- [x] Upload **feature graphic** 1024×500 (recommended)
- [x] Upload **phone screenshots** (minimum 2; export final PNGs from `docs/store-screenshots/` if needed)
- [x] Optional: tablet screenshots, promo video
- [x] Set contact email and privacy policy URL in listing

**Screenshot export (if needed):**

```powershell
pnpm --dir web run export:store-screenshots
```

---

## 7. Policy & compliance forms

Answers are drafted in repo; forms must be completed in Play Console.

### Done

- [x] Data safety answers drafted — [store-policy-forms.md](./store-policy-forms.md)
- [x] Stripe / no Play Billing disclosure documented in legal copy
- [x] Terms and privacy policy cover Google Play distribution
- [x] Self-service **Delete account** in Settings (production web, 2026-06-19) — cite in Data safety (“users can request deletion”)

### Still to do

- [ ] Create **reviewer WorkOS test account** (do not commit credentials)
- [ ] **App access** — provide reviewer login in Play Console only
- [ ] **Ads** — declare No
- [ ] **Content rating** — complete IARC questionnaire (disclose community / UGC)
- [ ] **Data safety** — enter account info, photos, purchase history, encryption, deletion (in-app delete at `/settings`)
- [ ] **Target audience** — confirm not directed at children under 13
- [ ] Add review note: subscriptions via **Stripe on web**, not Google Play Billing

---

## 8. Testing tracks

### Done

- [x] WorkOS login verified on Android device (2026-06-09)

### Still to do

#### Internal testing (do this first)

- [ ] Upload `app-release.aab` to **Testing → Internal testing**
- [ ] Add team tester emails
- [ ] Install from internal testing link on physical device
- [ ] Complete device smoke (section 9)

#### Optional before production

- [ ] Closed testing track with wider beta group
- [ ] Open testing track (public beta)

#### Production

- [ ] Promote release to **Production** (or upload directly after checks)
- [ ] Review **Pre-launch report** (automated Play tests)
- [ ] **Send for review** → **Start rollout**

---

## 9. Device smoke (before production)

Run on a **physical Android device** with the internal-testing build.

### Auth & session

- [x] WorkOS sign-in / sign-out
- [ ] Cold start → session persists
- [ ] Profile loads after restart

### Core flows

- [ ] Home, Profile, Contact tabs + bottom dock
- [ ] Directory, Community, Sponsors, Trusted, Podcasts load
- [ ] Profile edit + save
- [ ] Onboarding complete path
- [ ] Profile photo upload (camera / gallery prompts)
- [ ] Community post with image upload
- [ ] Contact / sponsor application submit

### Billing (store disclosure)

- [ ] Membership Stripe checkout completes on device
- [ ] Return from Checkout lands back in app / WebView
- [ ] Profile shows tier after webhook
- [ ] Manage billing portal opens and returns

### Mobile UX

- [ ] Safe areas (notch, gesture nav) — header + footer dock
- [ ] Keyboard does not cover form fields
- [ ] Modals / drawers scroll correctly
- [ ] No demo-only UI on production (`demoFlowsEnabled: false`)

---

## 10. Production launch & post-launch

### Still to do

- [ ] Increment `versionCode` (and `versionName` if user-visible) before each upload
- [ ] Google review approved
- [ ] Start **100% rollout** to production
- [ ] Set `NEXT_PUBLIC_ANDROID_PLAY_STORE_URL` on Vercel (enables `/download` store badge)
- [ ] Verify `/download` page links to live Play listing
- [ ] Monitor Android vitals and crash reports in Play Console

---

## 11. Repeatable release commands

| Step | Command |
|------|---------|
| Full prep | `pnpm run mobile:store:prep` |
| Open Android Studio | `pnpm --dir web run cap:open:android` |
| Signed AAB | `pnpm run mobile:android:bundle` |
| Validate Capacitor config | `pnpm run validate:capacitor` |
| Store screenshots | `pnpm --dir web run export:store-screenshots` |

**When you need a new Play upload:** native shell changes only (Capacitor upgrade, permissions, icons, manifest). Most product changes ship via Vercel without a store resubmission.

---

## Blockers before first Play submission

| # | Blocker | Status |
|---|---------|--------|
| 1 | Production web stable | Done |
| 2 | Upload keystore + signed AAB | Done |
| 3 | Play Console app created | **Open** |
| 4 | Store listing + policy forms in console | **Open** |
| 5 | Reviewer test account in App access | **Open** |
| 6 | Device smoke (section 9) | **Open** |

---

## Suggested next steps (in order)

1. Save keystore passwords from `web/android/keystore.properties` to your password manager
2. Rebuild AAB: `pnpm run mobile:store:prep` then `pnpm run mobile:android:bundle`
3. Rebuild AAB (`pnpm run mobile:store:prep` then `pnpm run mobile:android:bundle`) and upload to Play Console internal testing
4. Upload `web/android/app/build/outputs/bundle/release/app-release.aab` to **Internal testing**
5. Enroll in Play App Signing when prompted
6. Complete device smoke (section 9)
7. Enter store listing, Data safety, content rating, App access
8. Promote to Production and submit for review

---

*Update this file as items are completed. Detailed how-to steps remain in [ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md](../ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md).*
