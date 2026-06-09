# iOS / macOS setup — Capacitor → TestFlight & App Store

Step-by-step guide for building and submitting **The Outreach Project** iOS app on a **separate Mac**. The native shell is a Capacitor WebView that loads **Production** at `https://theoutreachproject.app` — you do **not** need WorkOS, Stripe, or Supabase secrets on the Mac for store builds.

**Related:** [ANDROID_STUDIO_SETUP.md](./ANDROID_STUDIO_SETUP.md) · [MOBILE_LAUNCH_CHECKLIST.md](./MOBILE_LAUNCH_CHECKLIST.md) §E · [mvp-production-launch.md](./mvp-production-launch.md) §9.5 · [store-listing-copy.md](./store-listing-copy.md) · [store-policy-forms.md](./store-policy-forms.md) · [legal/apple-app-routing-coverage.md](./legal/apple-app-routing-coverage.md) · [web/docs/CAPACITOR_MOBILE.md](../web/docs/CAPACITOR_MOBILE.md)

---

## Identity (do not change without updating stores)

| Field | Value |
|-------|--------|
| Bundle ID | `org.theoutreachproject.torp` |
| Display name | The Outreach Project |
| WebView URL | `https://theoutreachproject.app` |
| Xcode project | `web/ios/App/App.xcodeproj` |
| First release version | **1.0** (build **1**) |
| Config | `web/capacitor.config.js` |

---

## Overview

```
Mac: clone repo → mobile:prep:prod → Xcode Archive → App Store Connect → TestFlight smoke → App Store review
```

The Mac builds and signs the **native wrapper** only. Product features ship via **Vercel web deploy**; users get most updates without a new App Store release. Resubmit to the store when you change native shell pieces (Capacitor upgrade, permissions, icons, `Info.plist`).

---

## 1. One-time Mac setup

### Install tools

1. **Xcode** from the Mac App Store (latest stable).
2. Open Xcode once → accept license → **Xcode → Settings → Platforms** and install an **iOS** SDK if prompted.
3. **Xcode → Settings → Accounts** → sign in with your **Apple Developer** Apple ID (team enrolled in the Apple Developer Program).
4. **Node 22+** — [nodejs.org](https://nodejs.org) or `brew install node@22`.
5. **pnpm** — `npm install -g pnpm` (repo uses pnpm 10).

Verify in Terminal:

```bash
node -v    # v22.x
pnpm -v
xcodebuild -version
```

### Clone the repo

```bash
git clone https://github.com/theoutreachprojectpodcast-ui/top-app-v2.git
cd top-app-v2
git pull   # if already cloned — sync latest from your other machine
pnpm install
```

Sync via git; no need to copy files from Windows manually.

---

## 2. Point Capacitor at Production & open Xcode

From **repo root**:

```bash
pnpm --dir web run mobile:prep:prod
```

This sets `CAP_SERVER_URL=https://theoutreachproject.app`, runs `pnpm run build`, then `cap sync` into `web/ios/`.

**Note:** Missing Production env vars on the Mac during `build` is OK — the store app loads **live Production** in the WebView, not your local Next server.

Confirm embedded URL:

```bash
grep url web/ios/App/App/capacitor.config.json
# "url": "https://theoutreachproject.app"
```

Sync brand icon into Xcode asset catalog:

```bash
pnpm --dir web run mobile:icons
```

Open Xcode:

```bash
pnpm --dir web run cap:open:ios
```

Use scheme **App**. Capacitor 8 uses **Swift Package Manager** for plugins — CocoaPods is not required.

**Before every store build:** re-run `mobile:prep:prod` if you changed `capacitor.config.js`, `capacitor-www/`, or native permissions.

---

## 3. Apple Developer Portal (once)

At [developer.apple.com/account](https://developer.apple.com/account).

### A. Register Bundle ID

1. **Certificates, Identifiers & Profiles → Identifiers → +**
2. **App IDs → App** → Continue
3. Description: `The Outreach Project`
4. Bundle ID: **Explicit** → `org.theoutreachproject.torp`
5. Capabilities: defaults for v1 (no push, no IAP). Photo/camera usage strings are in `web/ios/App/App/Info.plist`.
6. Register

### B. Create app in App Store Connect

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps → + → New App**
2. Platform: **iOS**
3. Name: **The Outreach Project**
4. Primary language: English (U.S.)
5. Bundle ID: **`org.theoutreachproject.torp`**
6. SKU: e.g. `torp-ios-001` (internal only)
7. User Access: per your org (typically Full Access)

---

## 4. Xcode: signing, device run, archive

### A. Signing

1. Select **App** project → target **App** → **Signing & Capabilities**
2. **Team:** your Apple Developer team
3. **Automatically manage signing:** ON
4. **Bundle Identifier:** `org.theoutreachproject.torp`

Resolve any red errors (team, agreements, Bundle ID) before continuing.

### B. Run on a physical iPhone (before Archive)

1. Connect iPhone → trust the computer
2. Scheme **App**, destination **Your iPhone** (not simulator)
3. **Product → Run** (▶)

Xcode may register the device in the developer portal on first run.

#### Device smoke (required before store submit)

- [ ] App loads the live site (not blank shell)
- [ ] WorkOS **sign in** and **sign out**
- [ ] Kill app → reopen → **profile** persists
- [ ] Home, Directory, Community, Profile tabs
- [ ] Optional: membership Stripe checkout (web flow, no Apple IAP)
- [ ] Optional: profile photo upload (camera/photos permission)

Production WorkOS callback should already be `https://theoutreachproject.app/callback`. If sign-in fails, verify `capacitor.config.json` points at Production and test the same flow in **Safari** on the phone.

### C. Archive for App Store Connect

1. Destination: **Any iOS Device (arm64)** — not a simulator
2. **Product → Archive**
3. Organizer → **Distribute App**
4. **App Store Connect** → **Upload**
5. Accept defaults unless counsel advises otherwise
6. Wait for upload to complete

Build processing in App Store Connect usually takes **5–30 minutes** before it appears under **TestFlight**.

---

## 5. TestFlight (recommended before public release)

1. App Store Connect → your app → **TestFlight**
2. When build is **Ready to Test**:
   - **Internal testing:** add team Apple IDs — available immediately
   - **External testing** (optional): create group → Beta App Review
3. Install **TestFlight** on iPhone → accept invite → install build
4. Repeat **device smoke** on the TestFlight build (not only direct Xcode install)

---

## 6. App Store submission

App Store Connect → app → **App Store** tab → prepare for submission.

### Metadata

Use [store-listing-copy.md](./store-listing-copy.md) for title, subtitle, description, keywords.

| Field | Value |
|-------|--------|
| Privacy Policy URL | `https://theoutreachproject.app/privacy` |
| Support URL | `https://theoutreachproject.app/contact` |
| Category | Lifestyle or Social Networking (see store copy) |

### Screenshots

Minimum iPhone sizes: **6.7"** and **6.5"**. Capture Home, Directory, Community, Profile while signed in (simulator or device).

### App Privacy (nutrition labels)

Use [store-policy-forms.md](./store-policy-forms.md). Summary:

- Contact info (email, name) — account
- User content — community/profile
- Purchases — subscription status via Stripe web
- No cross-app tracking; no location; no advertising ID

### Age rating

Complete the questionnaire honestly — Community has user-generated content (often **12+** or **17+**).

### Review notes (paste into “Notes for Review”)

Full routing, URL coverage, and a paste-ready review block: **[legal/apple-app-routing-coverage.md](./legal/apple-app-routing-coverage.md)** §11.

Shorter version also in [store-listing-copy.md](./store-listing-copy.md#app-store-review-notes-paste-into-review-notes).

**Routing App Coverage File (.geojson):** Not required — this app is not an Apple Maps routing app. Leave that upload blank in App Store Connect. Do not enable Maps → Routing in Xcode.

```
This app loads our production web application (https://theoutreachproject.app) inside a native Capacitor WebView. Authentication uses WorkOS AuthKit; membership billing uses Stripe Checkout on the web (no Apple In-App Purchase products).

Test account:
Email: [dedicated reviewer account]
Password: [password — App Store Connect only, not in git]

Steps: Launch → sign in → browse Home, Directory, Community, Profile.
Support: support@theoutreachproject.app
```

Create a dedicated Production WorkOS user — see [store-policy-forms.md](./store-policy-forms.md). Do **not** commit credentials to the repo.

### Export compliance

See **[legal/app-encryption-apple.md](./legal/app-encryption-apple.md)** for the full App Encryption Documentation.

- Uses encryption: **Yes** (HTTPS / TLS)
- Typically **exempt** mass-market encryption (HTTPS only, no custom crypto). Set `ITSAppUsesNonExemptEncryption` = `NO` in Info.plist when counsel confirms. Confirm with counsel if unsure.

### Submit

1. Select the TestFlight **build**
2. **Add for Review** → Submit

Review often takes **24–48 hours**. Common rejections: missing login, App Privacy mismatch, broken WebView auth.

---

## 7. After approval

- Release **manually** or **automatically** in App Store Connect
- Monitor **Metrics** and **Xcode Organizer → Crashes**
- **Updates:** bump build (and version if user-facing) in Xcode → Archive → upload

---

## Quick commands (Mac)

```bash
cd top-app-v2
git pull
pnpm install
pnpm --dir web run mobile:prep:prod    # before every store build
pnpm --dir web run mobile:icons        # refresh iOS 1024×1024 icon
pnpm --dir web run cap:open:ios        # open Xcode
pnpm --dir web run validate:capacitor
```

Optional — regenerate all native icons/splash (Mac usually builds `sharp` successfully):

```bash
pnpm --dir web run mobile:assets       # sources in web/resources/
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| White screen | Re-run `mobile:prep:prod`; confirm `capacitor.config.json` has Production URL |
| Sign-in loops / fails | Confirm WorkOS redirect `https://theoutreachproject.app/callback`; test in Safari on device |
| Signing errors | Correct Team, active Developer Program, Bundle ID registered |
| Archive disabled | Select **Any iOS Device (arm64)**, not simulator |
| Build missing in TestFlight | Wait for processing; check email for export/compliance issues |
| Cannot install on device | Register device; refresh profiles (Automatic signing) |

---

## First-day checklist

- [ ] Xcode + Node 22 + pnpm installed
- [ ] Repo cloned; `pnpm install`
- [ ] `mobile:prep:prod` + `mobile:icons`
- [ ] Bundle ID registered; App Store Connect app created
- [ ] Xcode signing configured; run on physical iPhone
- [ ] Device smoke passed
- [ ] Archive uploaded to TestFlight
- [ ] TestFlight smoke passed
- [ ] Store listing + App Privacy + review notes submitted

---

*Update checkboxes as you complete items. Android path: [ANDROID_STUDIO_SETUP.md](./ANDROID_STUDIO_SETUP.md). Full mobile checklist: [MOBILE_LAUNCH_CHECKLIST.md](./MOBILE_LAUNCH_CHECKLIST.md).*
