# Android / Google Play — status checklist

Living checklist for **The Outreach Project** Android app submission.  
Update checkboxes as items are completed.

**Package name (source of truth):** `com.theoutreachproject.theoutreachproject` — must match `web/android/app/build.gradle` `applicationId` when creating the Play Console app.

**Production WebView URL:** `https://theoutreachproject.app/mobile`

**Related guides:** [ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md](../ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md) · [ANDROID_STUDIO_SETUP.md](./ANDROID_STUDIO_SETUP.md) · [MOBILE_LAUNCH_CHECKLIST.md](./MOBILE_LAUNCH_CHECKLIST.md) · [store-listing-copy.md](./store-listing-copy.md) · [store-policy-forms.md](./store-policy-forms.md)

**Last updated:** 2026-06-19

---

## Progress summary

| Area | Status |
|------|--------|
| Accounts & local tooling | Mostly done — keystore + signed AAB pending |
| Codebase & Capacitor | Done |
| Web production prerequisite | Done |
| Signing & release build | **Done** — signed AAB ready for upload |
| Play Console app record | **Not started** |
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
- [x] `applicationId` = `com.theoutreachproject.theoutreachproject`
- [x] Version **1.0** / `versionCode` **1** in `web/android/app/build.gradle`
- [x] Release signing wired in `build.gradle` (reads `keystore.properties` when present)
- [x] `keystore.properties.example` committed; real keystore gitignored
- [x] Launcher icons in `mipmap-*` densities
- [x] Branded splash screens (`mobile:splash`)
- [x] Scripts: `mobile:store:prep`, `mobile:android:bundle`, `mobile:prep:prod`, `validate:capacitor`
- [x] `pnpm run mobile:store:prep` passes
- [x] `gradlew assembleDebug` succeeds
- [x] Embedded config points at `https://theoutreachproject.app/mobile` after prod prep

### Still to do

- [ ] Commit and push any outstanding mobile-prep changes on the release branch
- [ ] Run `pnpm --dir web run lint` before final release
- [ ] Run `pnpm --dir web run smoke:routes` before final release

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

### Still to do

- [ ] Re-run production smoke before each store submission

---

## 4. Signing & release build

### Done

- [x] `keystore.properties.example` documents expected paths and aliases
- [x] Gradle `signingConfigs.release` configured
- [x] Upload keystore generated (`web/android/keystores/torp-upload.keystore`)
- [x] `keystore.properties` configured (gitignored)
- [x] `pnpm run mobile:android:bundle` — signed AAB built 2026-06-19 (~30 MB)
- [x] Output confirmed: `web/android/app/build/outputs/bundle/release/app-release.aab`
- [x] Android Capacitor config synced to `https://theoutreachproject.app` (2026-06-19)

### Still to do

- [ ] Store keystore passwords in team password manager (loss blocks updates)
- [ ] Enroll in **Google Play App Signing** on first AAB upload (Play Console prompt)

**Commands (first time):**

```powershell
New-Item -ItemType Directory -Force -Path web\android\keystores
keytool -genkeypair -v -storetype PKCS12 `
  -keystore web\android\keystores\torp-upload.keystore `
  -alias torp-upload -keyalg RSA -keysize 2048 -validity 10000
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

- [ ] **Create app** in Play Console — name: **The Outreach Project**
- [ ] Package name: **`com.theoutreachproject.theoutreachproject`** (cannot change later)
- [ ] Complete dashboard setup tasks (developer account, payments profile if required, etc.)
- [ ] Set default language and app category

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

- [ ] Enter main store listing in Play Console (title, short + full description)
- [ ] Upload **512×512** app icon
- [ ] Upload **feature graphic** 1024×500 (recommended)
- [ ] Upload **phone screenshots** (minimum 2; export final PNGs from `docs/store-screenshots/` if needed)
- [ ] Optional: tablet screenshots, promo video
- [ ] Set contact email and privacy policy URL in listing

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

### Still to do

- [ ] Create **reviewer WorkOS test account** (do not commit credentials)
- [ ] **App access** — provide reviewer login in Play Console only
- [ ] **Ads** — declare No
- [ ] **Content rating** — complete IARC questionnaire (disclose community / UGC)
- [ ] **Data safety** — enter account info, photos, purchase history, encryption, deletion
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
2. Create Play Console app with package `com.theoutreachproject.theoutreachproject`
3. Upload `web/android/app/build/outputs/bundle/release/app-release.aab` to **Internal testing**
4. Enroll in Play App Signing when prompted
5. Complete device smoke (section 9)
6. Enter store listing, Data safety, content rating, App access
7. Promote to Production and submit for review

---

*Update this file as items are completed. Detailed how-to steps remain in [ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md](../ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md).*
