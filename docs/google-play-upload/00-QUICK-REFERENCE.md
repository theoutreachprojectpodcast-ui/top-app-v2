# Quick reference — Google Play

| Field | Value |
|-------|--------|
| **App name** | The Outreach Project |
| **Package / applicationId** | `com.theoutreachproject` |
| **versionName** | `1.0.1` |
| **versionCode** | `7` (must increase every Play upload) |
| **Native shell** | Capacitor Android → production WebView |
| **WebView URL** | `https://theoutreachproject.app` (routes into `/mobile`) |
| **Default language** | English (United States) |
| **Category** | Lifestyle or Social Networking |
| **Contact email** | support@theoutreachproject.app |
| **Privacy policy** | https://theoutreachproject.app/privacy |
| **Terms** | https://theoutreachproject.app/terms |
| **Support / contact** | https://theoutreachproject.app/contact |
| **Website** | https://theoutreachproject.app |

## Signed AAB

| Field | Value |
|-------|--------|
| **File** | `app-release.aab` |
| **Folder** | `web\android\app\build\outputs\bundle\release\` |
| **Full path** | `C:\Users\andre\OneDrive\Documents\GitHub\top-app-v2\web\android\app\build\outputs\bundle\release\app-release.aab` |
| **Signing** | Upload keystore via `web/android/keystore.properties` (gitignored) |
| **Play App Signing** | Enroll on first upload (Google holds app signing key) |
| **Deobfuscation / mapping** | Not required — `minifyEnabled false` (ignore Console warning) |

## Store assets in this pack

| Asset | Path | Play requirement |
|-------|------|------------------|
| App icon 512×512 | `assets/icons/icon-512.png` | Required |
| Hi-res icon 1024 | `assets/icons/app-icon-dark-1024.png` | Optional source |
| Phone screenshots | `assets/phone-screenshots/*.png` | Min 2 |
| Feature graphic 1024×500 | Already uploaded in Play Console (not duplicated here) | Required for listing |

## Billing (important)

Membership and sponsors: **Stripe on the website** — **not** Google Play Billing.
