# iOS App Store release checklist — The Outreach Project

Mac / Capacitor / Xcode release guide for **`org.theoutreachproject.torp`**.  
This environment wraps the **production web app** at `https://theoutreachproject.app` — it does not ship a bundled Next.js build inside the IPA.

**Related:** [docs/MOBILE_READINESS.md](docs/MOBILE_READINESS.md) · [docs/MOBILE_LAUNCH_CHECKLIST.md](docs/MOBILE_LAUNCH_CHECKLIST.md) · [docs/MOBILE_ARCHITECTURE_GAPS.md](docs/MOBILE_ARCHITECTURE_GAPS.md)

**Last updated:** 2026-06-09

---

## Status summary

| Area | Status |
|------|--------|
| App icon (1024×1024, dark bg, no alpha) | ✅ Generated and installed |
| Capacitor production config | ✅ `CAP_SERVER_URL` → `https://theoutreachproject.app` |
| Xcode project / bundle ID | ✅ `org.theoutreachproject.torp` v**1.0** build **1** |
| Production URL smoke (HTTP) | ✅ Home, privacy, terms, sponsors, community, trusted → 200 |
| Production auth flags | ✅ `demoFlowsEnabled: false`, WorkOS + Stripe configured |
| `cap sync ios` | ✅ Passed |
| Local Xcode build | ⚠️ Blocked — **iOS 26.5 Platform** not installed (see §8) |
| Archive / upload | ⏳ Manual in Xcode after platform + signing |

---

## 1. App icon

### Assets used

| Asset | Path | Purpose |
|-------|------|---------|
| OP mark (dark) | `web/public/brand-logo-mark-dark.png` | Centered logo — readable at small sizes (no wordmark text) |
| Dark atmosphere reference | `web/public/home/app-page-background-dark.svg` | Gradient colors for icon background |

### Generation

```bash
# Requires Pillow (venv recommended)
python3 -m venv .venv-icon && .venv-icon/bin/pip install pillow
.venv-icon/bin/python3 web/scripts/generate-ios-app-icon.py
```

**Outputs:**

- `web/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` (1024×1024, **no alpha**)
- `assets/icon-1024.png`
- `web/public/icon-1024.png`, `web/public/icon-512.png`

### AppIcon.appiconset

`Contents.json` uses the modern single **universal 1024×1024** entry (Xcode 15+). No multi-size PNG set required.

### Previous issue (fixed)

The prior icon used a **white** background with transparency-capable PNG. The new icon uses the **dark-mode gradient** (`#152019` → `#101814` → `#0c1210`) with ~19% padding and the **mark-only** logo at 62% canvas width.

---

## 2. Capacitor configuration

| Setting | Value |
|---------|--------|
| Config file | `web/capacitor.config.js` |
| appId / bundle ID | `org.theoutreachproject.torp` |
| appName | The Outreach Project |
| webDir | `capacitor-www` (fallback shell only) |
| Production `server.url` | `https://theoutreachproject.app` |
| cleartext | `false` (HTTPS only) |
| allowNavigation | Production origin, WorkOS, Stripe Checkout/Billing, Supabase |
| iOS `contentInset` | `automatic` |
| iOS `preferredContentMode` | `mobile` |
| Plugins | `@capacitor/share` |

### Sync for production (run before every native release)

```bash
pnpm install
pnpm --dir web run validate:capacitor
CAP_SERVER_URL=https://theoutreachproject.app pnpm --dir web exec cap sync ios
# Or full pipeline (includes Next build):
pnpm --dir web run mobile:prep:prod
```

**Verify** embedded config after sync:

`web/ios/App/App/capacitor.config.json` → `"url": "https://theoutreachproject.app"`

**Secrets:** WorkOS, Supabase, Stripe keys stay on **Vercel** — never in the native project.

---

## 3. Xcode project

| Setting | Value |
|---------|--------|
| Project path | `web/ios/App/App.xcodeproj` |
| Scheme | **App** (shared: `xcshareddata/xcschemes/App.xcscheme`) |
| Bundle identifier | `org.theoutreachproject.torp` |
| Marketing version | **1.0** |
| Build number | **1** (increment before each App Store upload) |
| Deployment target | iOS **15.0** |
| Devices | iPhone + iPad (`TARGETED_DEVICE_FAMILY = 1,2`) |
| Orientations | Portrait + landscape (phone); all orientations (iPad) |
| Signing | Automatic (team must be selected manually — see §8) |
| App icon set | `AppIcon` |
| Launch screen | `LaunchScreen.storyboard` → `Splash` imageset |

### Open project

```bash
pnpm --dir web run cap:open:ios
```

---

## 4. Production environment

| Check | Result (2026-06-09) |
|-------|---------------------|
| Production origin | `https://theoutreachproject.app` |
| WebView loads remote app | ✅ via `server.url` in Capacitor config |
| `/api/auth/status` | ✅ `demoFlowsEnabled: false`, `workos: true`, `stripe: true` |
| Legal pages | ✅ `/privacy`, `/terms` → 200 |
| Key routes | ✅ `/`, `/sponsors`, `/community`, `/trusted` → 200 |
| QA / localhost in native config | ✅ None |
| Demo UI in production web | ✅ Hidden (`NODE_ENV=production`) |

### Device smoke (required before submit)

On simulator or **ADG iPhone** after platform install:

- [ ] Sign in / sign out (WorkOS hosted auth)
- [ ] Profile view + edit
- [ ] Membership / Stripe checkout (web flow inside WebView)
- [ ] Sponsors, community, trusted resources
- [ ] Admin routes blocked for non-admin users
- [ ] Avatar / community photo picker (camera + photo library prompts)
- [ ] External links (Stripe, WorkOS) behave as expected
- [ ] No debug panels or demo “Reset” chrome

---

## 5. App Store review risks

| Risk | Mitigation |
|------|------------|
| **Guideline 3.1.1 — IAP** | Membership sold via **Stripe on website** inside WebView, not Apple IAP. State in **Review Notes**: *“Subscriptions are purchased on our website (Stripe); no in-app purchase products.”* |
| Login required | ✅ WorkOS sign-in works in mobile WebView (test on device) |
| Privacy policy / terms | ✅ Linked on production site; ensure visible from profile/settings |
| Placeholder / demo content | ✅ `demoFlowsEnabled: false` on production |
| Broken links / localhost | ✅ None in Capacitor production config |
| App icon transparency | ✅ Fixed — `hasAlpha: no` |
| Export compliance | ✅ `ITSAppUsesNonExemptEncryption = false` in Info.plist |
| Account deletion | Confirm App Store Connect privacy answers match site policy |
| Splash screen | ⚠️ Still **white** default Capacitor splash — optional polish: regenerate from dark icon (not blocking) |
| Deep links / Universal Links | ⛔ Not configured (no Associated Domains entitlement) — OK if not marketed |

### PC-side tasks (do not fix in Mac-only scope)

If device testing reveals web bugs (auth cookie edge cases, layout, billing copy), file issues for the **PC / Vercel** pipeline — do not rebuild web features here.

---

## 6. iOS permissions (Info.plist)

| Key | Used? | Description |
|-----|-------|-------------|
| `NSPhotoLibraryUsageDescription` | ✅ Profile / community photos | Present |
| `NSCameraUsageDescription` | ✅ Camera capture for photos | Present |
| `NSMicrophoneUsageDescription` | ❌ Not used | Not added |
| `NSLocationWhenInUseUsageDescription` | ❌ Not used | Not added |
| `NSUserTrackingUsageDescription` | ❌ Not used | Not added |
| Push notifications | ❌ Not implemented | No capability |

Photo access uses standard HTML file inputs in the WebView — no `@capacitor/camera` plugin.

---

## 7. Build workflow (repeatable)

```bash
# From repo root
pnpm install
python3 web/scripts/generate-ios-app-icon.py   # when brand assets change
pnpm --dir web run mobile:prep:prod            # build + cap sync → production URL
pnpm --dir web run cap:open:ios
```

Validate structure only:

```bash
pnpm --dir web run validate:capacitor
```

---

## 8. Manual Xcode steps (required on this Mac)

### A. Install missing Xcode platform (blocker observed 2026-06-09)

Xcode **26.5** SDK is installed, but **iOS 26.5 Platform** components are missing. Builds fail with:

> `iOS 26.5 Platform Not Installed`

**Fix:** Xcode → **Settings** → **Components** → download **iOS 26.5** (and device support for **ADG iPhone** if testing on device).

### B. Signing

1. Open `web/ios/App/App.xcodeproj`
2. Target **App** → **Signing & Capabilities**
3. Select your **Team** (Apple Developer account)
4. Confirm **Bundle Identifier** = `org.theoutreachproject.torp`
5. Let Xcode manage provisioning (Automatic)

### C. Version / build

Before each upload:

1. **Increment** `CURRENT_PROJECT_VERSION` (build number) in Xcode → General, or edit `project.pbxproj`
2. Update **Marketing Version** when shipping a user-visible release (currently **1.0**)

### D. Archive

1. **Product** → **Clean Build Folder** (⇧⌘K)
2. Select destination **Any iOS Device (arm64)**
3. **Product** → **Archive**
4. In Organizer: **Validate App** → **Distribute App** → App Store Connect

### E. Simulator / device test

1. Select simulator (e.g. iPhone 16) or **ADG iPhone**
2. **Run** (⌘R) — app should load `https://theoutreachproject.app`

---

## 9. Manual App Store Connect steps

1. Confirm app record exists for **`org.theoutreachproject.torp`**
2. Upload build from Xcode Organizer (or Transporter)
3. **App Privacy** questionnaire — align with web app data collection (WorkOS account, profile, Stripe)
4. **Age rating** questionnaire
5. Screenshots (6.7", 6.5", 5.5" etc.) — capture from simulator or device
6. **Review notes** — mention Stripe web checkout, no native IAP
7. **Support URL** / **Marketing URL** — production site
8. Submit for review

---

## 10. Final pre-submit checklist

- [ ] iOS 26.5 platform installed in Xcode
- [ ] Team selected; archive succeeds
- [ ] Build number incremented
- [ ] `capacitor.config.json` shows `https://theoutreachproject.app`
- [ ] App icon visible on home screen (dark mark on dark gradient)
- [ ] Login / logout on physical device
- [ ] Membership checkout tested (live or test mode per policy)
- [ ] Privacy + terms accessible in app
- [ ] No demo UI visible
- [ ] Review notes mention Stripe / no IAP
- [ ] Export compliance: standard encryption only (`ITSAppUsesNonExemptEncryption = false`)

---

## Files changed in this release prep (2026-06-09)

| File | Change |
|------|--------|
| `web/scripts/generate-ios-app-icon.py` | New — reproducible App Store icon generator |
| `web/ios/.../AppIcon-512@2x.png` | Regenerated (dark bg, mark, no alpha) |
| `assets/icon-1024.png`, `web/public/icon-1024.png`, `icon-512.png` | Regenerated |
| `web/ios/App/App/Info.plist` | Added `ITSAppUsesNonExemptEncryption` |
| `web/ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` | Shared scheme for archive |
| `web/ios/App/App/capacitor.config.json` | Synced with production URL |
