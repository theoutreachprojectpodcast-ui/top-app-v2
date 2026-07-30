# Google Play upload pack — engineers (from source)

Self-serve Play Console materials for **The Outreach Project**.  
If the primary release owner is unavailable, pull `main` and follow this file.

## On GitHub (this folder)

| Path | What it is |
|------|------------|
| [`DRIVE-SHARE/`](./DRIVE-SHARE/) | Listing graphics, paste-ready copy, policy answers, legal URLs |
| [`DRIVE-SHARE/00-START-HERE.txt`](./DRIVE-SHARE/00-START-HERE.txt) | Partner/Console upload map |
| [`DRIVE-SHARE/06-ENGINEER-FROM-SOURCE.txt`](./DRIVE-SHARE/06-ENGINEER-FROM-SOURCE.txt) | Rebuild AAB + upload when owner is out |
| [`00-QUICK-REFERENCE.md`](./00-QUICK-REFERENCE.md) … [`06-…`](./06-CLOSED-TESTING-TO-PRODUCTION.md) | Extra Play Console reference |
| `web/scripts/assemble-google-play-drive-pack.py` | Regenerates `DRIVE-SHARE/` from repo assets |

## Not on GitHub (by design)

| Artifact | Why | How to get it |
|----------|-----|----------------|
| `*.aab` | Large, regenerable, signed | `pnpm run mobile:android:bundle` |
| `*.zip` Drive pack | Regenerable | Assemble script + zip locally / Drive |
| Upload keystore | Secret | Team password manager / release owners only |
| `keystore.properties` | Secret | Copy from `web/android/keystore.properties.example` |

## Current identity

| Field | Value |
|-------|--------|
| Package | `com.theoutreachproject` |
| versionName | `1.0` |
| versionCode | See `web/android/app/build.gradle` (must increase every Play upload) |
| WebView | `https://theoutreachproject.app` |

## Quick path (engineer, owner unavailable)

```bash
git pull origin main
pnpm install
# Requires keystore.properties + keystores/top-upload.keystore (from secrets vault)
pnpm run mobile:store:prep
pnpm run mobile:android:bundle
# Output: web/android/app/build/outputs/bundle/release/app-release.aab
python web/scripts/assemble-google-play-drive-pack.py   # optional refresh of DRIVE-SHARE
```

Upload the new AAB in Play Console → **Testing → Closed testing** (or Production after access unlocks).  
Paste listing/policy text from `DRIVE-SHARE/03-listing-copy/` and `04-policy-and-review/`.

Full Android guide: [ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md](../../ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md)
