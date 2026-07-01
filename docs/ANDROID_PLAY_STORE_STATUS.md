# Android / Google Play — status checklist

Living checklist for **The Outreach Project** Android app submission.  
Update checkboxes as items are completed.

**Android package name (Play Console / `applicationId`):** `com.theoutreachproject` — must match `web/android/app/build.gradle` `applicationId`.  
**iOS bundle ID / Capacitor `appId`:** `com.theoutreachproject.theoutreachproject` (unchanged; deep-link URL schemes use this id).

**Production WebView URL:** `https://theoutreachproject.app` (embedded in native config after `mobile:prep:prod`; app routes users into `/mobile` on load)

**Related guides:** [ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md](../ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md) · [ANDROID_STUDIO_SETUP.md](./ANDROID_STUDIO_SETUP.md) · [MOBILE_LAUNCH_CHECKLIST.md](./MOBILE_LAUNCH_CHECKLIST.md) · [store-listing-copy.md](./store-listing-copy.md) · [store-policy-forms.md](./store-policy-forms.md)

**Last updated:** 2026-06-23 (iOS **live** on App Store; Android internal testing next)

---

## Recent activity

| Date | Action | Result |
|------|--------|--------|
| 2026-06-19 | Local tooling, keystore, first AAB, production push `6a96afc` | Done |
| 2026-06-19 | Play package mismatch fix — `applicationId` → `com.theoutreachproject` | Done |
| 2026-06-19 | Store listing assets + copy entered in Play Console | Done |
| 2026-06-23 | Production torp→top deploy + health monitor green (`929b530`) | Done |
| 2026-06-23 | Play upload blocked — `versionCode 3` already used (production) | Bumped → **4**, rebuild |
| **Next** | Upload **versionCode 4** AAB to production (or promote from testing) | **You are here** |

---

## Progress summary

| Area | Status |
|------|--------|
| Accounts & local tooling | **Done** |
| Codebase & Capacitor | **Done** |
| Web production prerequisite | **Done** (latest `main` — health + mobile OAuth OK) |
| Signing & release build | **Done** — AAB `versionCode` **4** on disk |
| Play Console app record | **Done** — package `com.theoutreachproject` |
| Store listing (console) | **Done** |
| iOS App Store | **Done** — live (2026-06-23) |
| Policy & compliance forms (Play) | **Open** |
| Internal testing upload | **Open** — upload v3 AAB, add testers |
| Device smoke testing | **Partial** — login verified 2026-06-09; full checklist open |
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
- [x] Version **1.0** / `versionCode` **4** in `web/android/app/build.gradle` (increment before each Play upload)
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
- [x] Latest production deploy from `main` — torp→top rename, health monitor green, mobile OAuth handoff OK (2026-06-23)
- [x] Pre–Play Console production smoke — `smoke:production:http` all checks pass (re-run after major prod changes)

### Still to do

_(none — re-run before each new Play upload if production changed)_

---

## 4. Signing & release build

### Done

- [x] `keystore.properties.example` documents expected paths and aliases
- [x] Gradle `signingConfigs.release` configured
- [x] Upload keystore generated (`web/android/keystores/top-upload.keystore`)
- [x] `keystore.properties` configured (gitignored)
- [x] `pnpm run mobile:android:bundle` — signed AAB built; **current build: `versionCode` 3** (~30 MB, 2026-06-23)
- [x] Output confirmed: `web/android/app/build/outputs/bundle/release/app-release.aab`
- [x] Bundle script verifies package + `versionCode` via bundletool after each build
- [x] Android Capacitor config synced to `https://theoutreachproject.app`

### Still to do

- [ ] Enroll in **Google Play App Signing** on first successful AAB upload (Play Console prompt — accept Google-managed signing key)
- [ ] After each Play upload attempt, increment `versionCode` in `build.gradle` before rebuilding (Play never reuses a version code)

**Current upload file (use this one):**

| Field | Value |
|-------|--------|
| Path | `web\android\app\build\outputs\bundle\release\app-release.aab` |
| Package | `com.theoutreachproject` |
| versionCode | **4** |
| versionName | 1.0 |

**Rebuild before next upload (bumps require editing `build.gradle` first):**

```powershell
# 1. Edit web/android/app/build.gradle → increment versionCode (e.g. 3 → 4)
pnpm run mobile:store:prep
pnpm run mobile:android:bundle
# Script prints "Verified AAB: package=… versionCode=…" — confirm before uploading
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

### Done

- [x] App name, short description, full description — [store-listing-copy.md](./store-listing-copy.md) + entered in Play Console
- [x] **512×512** app icon uploaded
- [x] **Feature graphic** 1024×500 uploaded
- [x] **Phone screenshots** uploaded (minimum 2)
- [x] Contact email + privacy policy URL in listing (`https://theoutreachproject.app/privacy`)
- [x] Support email: `support@theoutreachproject.app`

### Still to do

_(none required for first internal test — optional tablet screenshots / promo video)_

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

- [ ] Upload **`versionCode` 3** AAB to **Testing → Internal testing → Create new release**
- [ ] Confirm Play shows **version code 3** before saving (see **Release → App bundle explorer** if unsure what’s already uploaded)
- [ ] Accept **Play App Signing** enrollment when prompted (recommended)
- [ ] Add team tester emails (or Google Group)
- [ ] Install from internal testing opt-in link on a physical device
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

- [x] `versionCode` workflow documented — increment in `build.gradle` before each upload (currently **4**)
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
| Signed AAB | `pnpm run mobile:android:bundle` (clean build + bundletool verify) |
| Production smoke | `pnpm --dir web run smoke:production:http` |
| Validate Capacitor config | `pnpm run validate:capacitor` |
| Store screenshots | `pnpm --dir web run export:store-screenshots` |

**When you need a new Play upload:** native shell changes only (Capacitor upgrade, permissions, icons, manifest). Most product changes ship via Vercel without a store resubmission.

---

## Blockers before first Play submission

| # | Blocker | Status |
|---|---------|--------|
| 1 | Production web stable | **Done** |
| 2 | Upload keystore + signed AAB (`versionCode` 4) | **Done** |
| 3 | Play Console app + store listing | **Done** |
| 4 | Internal testing AAB uploaded | **Open** ← current |
| 5 | Policy forms (Data safety, content rating, App access) | **Open** |
| 6 | Device smoke (section 9) | **Open** |

---

## Next steps (walkthrough)

You are past setup. Follow this order:

### Step 1 — Upload internal testing build (~10 min)

1. Open [Google Play Console](https://play.google.com/console) → **The Outreach Project**
2. **Testing → Internal testing → Create new release** (do not reuse an old draft)
3. Upload:
   ```
   web\android\app\build\outputs\bundle\release\app-release.aab
   ```
4. Confirm the release shows **version code 3** / **1.0**
5. If prompted, enroll in **Play App Signing** (let Google manage the app signing key; you keep the upload keystore)
6. Add release notes (e.g. “Initial internal test build.”)
7. **Save** → **Review release** → **Start rollout to Internal testing**

**If upload fails with “version code already used”:** check **Release → App bundle explorer** for the highest version code, bump `versionCode` in `web/android/app/build.gradle`, run `pnpm run mobile:android:bundle`, upload again.

### Step 2 — Add testers & install (~5 min)

1. **Internal testing → Testers** tab → create an email list (or use a Google Group)
2. Copy the **opt-in URL** and open it on your Android phone (signed into a tester Google account)
3. Install **The Outreach Project** from the Play Store tester link

### Step 3 — Device smoke on real hardware (~30–60 min)

Work through [section 9](#9-device-smoke-before-production) on the installed build. Priority checks:

- Sign in / sign out (WorkOS)
- Cold start — session persists
- Home, Directory, Community, Profile load
- Profile photo upload
- Stripe membership checkout (web billing — not Play Billing)
- Safe areas + keyboard on forms

### Step 4 — Policy & compliance forms (~30 min)

In Play Console → **Policy → App content**, complete:

| Form | What to enter |
|------|----------------|
| **App access** | WorkOS test account credentials (create a reviewer-only login; never commit to git) |
| **Ads** | No |
| **Content rating** | IARC questionnaire — disclose community / user-generated content |
| **Data safety** | Use [store-policy-forms.md](./store-policy-forms.md); cite in-app delete at `/settings` |
| **Target audience** | Not directed at children under 13 |

**Review note for Google:** Membership and sponsors bill via **Stripe on the website**, not Google Play Billing.

### Step 5 — Pre-launch report & production (~1–3 days review)

1. After internal testing is stable, open **Release → Production → Create new release**
2. Promote the tested bundle (or upload a new AAB with a higher `versionCode`)
3. Review **Pre-launch report** (automated tests)
4. **Send for review** → when approved, **Start rollout** (staged or 100%)
5. Copy the public Play Store URL → set `NEXT_PUBLIC_ANDROID_PLAY_STORE_URL` in Vercel production
6. Confirm `https://theoutreachproject.app/download` shows the live badge

### Step 6 — Ongoing

- Product changes → deploy via **Vercel** (no store update needed for most web changes)
- Native changes (Capacitor, permissions, icons) → bump `versionCode`, rebuild AAB, new Play release
- Re-run `pnpm --dir web run smoke:production:http` before each store submission

---

*Update this file as items are completed. Detailed how-to steps remain in [ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md](../ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md).*
