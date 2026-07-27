# Apple App Store upload pack — The Outreach Project

## Share with the team (Google Drive)

**Upload this ZIP to Drive:**

`docs/apple-app-store-upload/TOP-Apple-App-Store-Upload-Pack.zip`

**Or share the unpacked folder:**

`docs/apple-app-store-upload/DRIVE-SHARE/`

### Current native identity (repo)

| Field | Value |
|-------|--------|
| Bundle ID | `com.theoutreachproject.theoutreachproject` |
| Marketing version | `1.0` |
| Build number | `7` (bumped for this redeploy) |
| WebView URL | `https://theoutreachproject.app` |

### DRIVE-SHARE layout

| Folder | Contents |
|--------|----------|
| `01-xcode-project-notes/` | Bundle ID, version, project paths |
| `02-store-listing-assets/` | 1024 icon + iPhone/iPad screenshots |
| `03-listing-copy/` | Name, description, keywords, What’s New |
| `04-policy-and-review/` | App Privacy summary + Review Notes |
| `05-legal/` | Privacy/terms + URLs |
| `06-mac-archive-runbook/` | Exact Mac Archive → TestFlight → Submit steps |

Start with `DRIVE-SHARE/00-START-HERE.txt`.

## Important

- The **IPA is not in this pack** — it must be archived on a **Mac with Xcode**.
- If App Store Connect already has build **7**, bump `CURRENT_PROJECT_VERSION` again before uploading.

## Rebuild the pack

```powershell
python web/scripts/assemble-apple-app-store-drive-pack.py
```

## Mac commands (after Drive handoff / git pull)

```bash
pnpm install
pnpm run mobile:store:prep
pnpm --dir web run cap:open:ios
# Then Archive → Validate → Distribute (see DRIVE-SHARE/06-mac-archive-runbook/)
```

## Related guides

- [IOS_APP_STORE_RELEASE_CHECKLIST.md](../../IOS_APP_STORE_RELEASE_CHECKLIST.md)
- [docs/IOS_XCODE_SETUP.md](../IOS_XCODE_SETUP.md)
- [docs/store-listing-copy.md](../store-listing-copy.md)
