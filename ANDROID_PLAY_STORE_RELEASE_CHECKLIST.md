# Google Play Store release checklist — The Outreach Project

Android / Capacitor release guide for **`org.theoutreachproject.torp`**.  
The native shell loads the **live production web app** at `https://theoutreachproject.app/mobile` — no bundled Next.js build inside the AAB.

**Related:** [docs/ANDROID_PLAY_STORE_STATUS.md](docs/ANDROID_PLAY_STORE_STATUS.md) (done vs. todo) · [docs/MOBILE_LAUNCH_CHECKLIST.md](docs/MOBILE_LAUNCH_CHECKLIST.md) · [docs/ANDROID_STUDIO_SETUP.md](docs/ANDROID_STUDIO_SETUP.md) · [IOS_APP_STORE_RELEASE_CHECKLIST.md](IOS_APP_STORE_RELEASE_CHECKLIST.md)

**Last updated:** 2026-06-09

---

## Status summary

| Area | Status |
|------|--------|
| Capacitor Android project | ✅ `web/android/` |
| Production WebView URL | ✅ `https://theoutreachproject.app/mobile` |
| Version **1.0** / versionCode **1** | ✅ Aligned with iOS |
| Launcher icons + splash | ✅ `mobile:icons` + `mobile:splash` |
| Debug build (`assembleDebug`) | ✅ Documented |
| WorkOS login on device | ✅ Working (2026-06-09) |
| Upload keystore | ⏳ Generate locally (§2) |
| Signed AAB | ⏳ After keystore + `mobile:android:bundle` |
| Play Console listing | ⏳ Manual |

---

## 1. One-shot prep (run before every release)

From **repo root**:

```bash
pnpm install
pnpm run mobile:store:prep
```

This runs `validate:capacitor`, production Next build, splash/icons sync, `cap sync`, and verifies embedded config points at **`https://theoutreachproject.app/mobile`**.

---

## 2. Upload keystore (first time only)

**Never commit** passwords or keystore files. They are gitignored (`web/android/keystore.properties`, `web/android/keystores/`).

### Generate keystore

```bash
mkdir -p web/android/keystores
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore web/android/keystores/torp-upload.keystore \
  -alias torp-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Record passwords in your team password manager. **Loss of this keystore blocks future Play updates** unless Play App Signing recovery is configured.

### Configure Gradle

```bash
cp web/android/keystore.properties.example web/android/keystore.properties
# Edit storePassword, keyPassword, and paths if needed
```

`web/android/app/build.gradle` reads `keystore.properties` and signs `release` builds automatically.

### Play App Signing

In Play Console, enable **Google Play App Signing** on first upload. Google holds the app signing key; you upload with the upload key above.

---

## 3. Build signed AAB

```bash
# JAVA_HOME → Android Studio JBR, e.g.:
# export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

pnpm run mobile:android:bundle
```

**Output:** `web/android/app/build/outputs/bundle/release/app-release.aab`

Alternative: Android Studio → **Build → Generate Signed Bundle / APK** → Android App Bundle.

---

## 4. Play Console setup

### 4.1 Create app

1. [Google Play Console](https://play.google.com/console) → **Create app**
2. **The Outreach Project**
3. Package name: **`org.theoutreachproject.torp`** (must match `applicationId`)
4. Complete dashboard setup tasks

### 4.2 Internal testing track

1. **Testing → Internal testing** → Create release
2. Upload **`app-release.aab`**
3. Add tester emails (team)
4. Install from Play internal link → run device smoke (§6)

### 4.3 Store listing

Use [docs/store-listing-copy.md](docs/store-listing-copy.md):

| Asset | Requirement |
|-------|-------------|
| App name | The Outreach Project |
| Short description | 80 chars max |
| Full description | From store-listing-copy.md |
| App icon | 512×512 PNG (`web/public/icon-512.png`) |
| Feature graphic | 1024×500 (optional but recommended) |
| Phone screenshots | Min 2; exports in `docs/store-screenshots/` |
| Privacy policy | `https://theoutreachproject.app/privacy` |

### 4.4 Policy forms

See [docs/store-policy-forms.md](docs/store-policy-forms.md):

- **App access** — reviewer WorkOS test account (paste credentials in console only)
- **Ads** — No
- **Content rating** — IARC questionnaire
- **Data safety** — Account info (WorkOS), profile data, payments via Stripe on web
- **Target audience** — Per product policy

### 4.5 Billing disclosure (review)

Membership is sold via **Stripe** (website / allowed WebView navigation), **not** Google Play Billing. State in release notes and Data safety:

> Subscriptions and sponsor packages are purchased through our website (Stripe). The app does not offer Google Play in-app products.

---

## 5. Version numbers

Before each Play upload, increment **`versionCode`** in `web/android/app/build.gradle` (must always increase). Update **`versionName`** for user-visible releases.

After editing Gradle, re-run `mobile:store:prep` if you changed native config; AAB-only changes need only `mobile:android:bundle`.

Keep iOS **Marketing Version / Build** in sync where possible for support.

---

## 6. Device smoke (before production track)

On a **physical Android device** with the internal-testing build:

- [x] WorkOS sign-in / sign-out
- [ ] Cold start → session persists
- [ ] Home, Profile, Contact tabs + bottom dock
- [ ] Profile edit + save
- [ ] Membership / Stripe checkout (returns to app)
- [ ] Photo upload (camera / gallery prompts)
- [ ] No demo UI on production
- [ ] Safe areas (notch, gesture nav) — header + footer dock

---

## 7. Promote to production

1. Internal testing sign-off
2. **Production → Releases** → Create new release → same or newer AAB
3. Complete **Pre-launch report** (Play automatic tests)
4. **Send for review** → **Start rollout**

### After approval

Set on Vercel (enables `/download` page store badges):

- `NEXT_PUBLIC_ANDROID_PLAY_STORE_URL` → Play Store listing URL

---

## 8. Repeatable release commands

| Step | Command |
|------|---------|
| Full prep | `pnpm run mobile:store:prep` |
| Open Android Studio | `pnpm --dir web run cap:open:android` |
| Signed AAB | `pnpm run mobile:android:bundle` |
| Store screenshots | `pnpm --dir web run export:store-screenshots` |
| Validate config only | `pnpm run validate:capacitor` |

---

## 9. Final pre-submit checklist

- [ ] `mobile:store:prep` passes; embedded URL = `https://theoutreachproject.app/mobile`
- [ ] `versionCode` incremented
- [ ] Signed AAB built with upload keystore
- [ ] Internal testing install + §6 smoke passed
- [ ] Store listing + Data safety + content rating complete
- [ ] Reviewer test account in App access (not in git)
- [ ] Stripe / no Play Billing noted in listing and review notes
