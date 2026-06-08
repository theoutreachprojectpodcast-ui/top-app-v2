# Android Studio setup (Capacitor / TOP)

Android Studio **2026.1.1.8** was installed on this machine via `winget install Google.AndroidStudio`. The IDE is at:

`C:\Program Files\Android\Android Studio\bin\studio64.exe`

**SDK status (2026-06):** First-run wizard completed. SDK at `%LOCALAPPDATA%\Android\Sdk` with `platform-tools`, `build-tools`, `emulator`, and `platforms`. `adb` works via full path; add to **Path** (below) so terminals find `adb` without the full path.

---

## 1. First launch (done on this machine)

If setting up another PC:

1. Open **Android Studio** (Start menu → Android Studio, or run `studio64.exe`).
2. Complete the setup wizard (**Standard**, accept licenses, SDK + platform + system image API 34/35).
3. **Tools → SDK Manager → SDK Tools** — **Android SDK Build-Tools**, **Platform-Tools**, **Emulator** installed.

---

## 2. Environment variables (Windows)

Add **User** environment variables (System Properties → Environment Variables, or PowerShell as your user):

| Variable | Value |
|----------|--------|
| `ANDROID_HOME` | `%LOCALAPPDATA%\Android\Sdk` |
| `JAVA_HOME` | Prefer Android Studio’s bundled JDK (see below) |

Add to **Path** (user Path):

```
%LOCALAPPDATA%\Android\Sdk\platform-tools
%LOCALAPPDATA%\Android\Sdk\emulator
%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin
```

**Bundled JDK (recommended for Gradle):** Android Studio ships a JDK. After first launch, set:

```
JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
```

(Exact path may be `jbr` under the Android Studio install folder — check `C:\Program Files\Android\Android Studio\` for `jbr` or `jre`.)

**Note:** System Java 8 may still be on PATH; Gradle for this project needs **JDK 17+**. Using Android Studio’s JDK avoids version conflicts.

Restart the terminal (and Cursor) after changing env vars.

Verify:

```powershell
adb version
echo $env:ANDROID_HOME
```

---

## 3. Sync Capacitor project

From repo root (requires **Node ≥ 22** for `@capacitor/cli`):

```powershell
cd web
$env:CAP_SERVER_URL = "https://theoutreachproject.app"
pnpm install
pnpm exec cap sync android
pnpm run cap:open:android
```

In Android Studio:

1. Wait for **Gradle sync** to finish (first open can take several minutes).
2. **Run** on an emulator or USB device with USB debugging enabled.

### Emulator → local Next.js dev server

If testing against local dev (`pnpm dev` on port 3001):

```powershell
$env:CAP_SERVER_URL = "http://10.0.2.2:3001"
pnpm exec cap sync android
```

`10.0.2.2` is the Android emulator’s alias for the host machine’s `localhost`.

### Production WebView

```powershell
$env:CAP_SERVER_URL = "https://theoutreachproject.app"
pnpm run mobile:prep:prod
pnpm exec cap sync android
```

---

## 4. Project scripts (reference)

| Command | Purpose |
|---------|---------|
| `pnpm --dir web run cap:open:android` | Open `web/android` in Android Studio |
| `pnpm --dir web run mobile:prep:prod` | Point Capacitor at production URL + sync |
| `pnpm --dir web run mobile:sync` | Build Next + `cap sync` |

See also: [web/docs/CAPACITOR_MOBILE.md](../web/docs/CAPACITOR_MOBILE.md), [MOBILE_READINESS.md](./MOBILE_READINESS.md), [mvp-production-launch.md](./mvp-production-launch.md) §9.

---

## 5. Troubleshooting

| Issue | Fix |
|-------|-----|
| Gradle sync fails / wrong Java | Set `JAVA_HOME` to Android Studio `jbr`, not Java 8 |
| `sdkmanager` not found | Install **SDK Command-line Tools** in SDK Manager |
| `adb` not recognized | Add `platform-tools` to PATH; reopen terminal |
| Emulator has no Google Play image | Use a **Google APIs** system image in AVD Manager |
| White screen in app | Check `CAP_SERVER_URL`, HTTPS, and WorkOS redirect URIs for WebView |

---

## 6. Checklist

- [x] Android Studio first-run wizard completed (this machine)
- [ ] `adb version` works in a **new** terminal (add platform-tools to user Path — see §2)
- [ ] `pnpm exec cap sync android` succeeds in `web/`
- [ ] App runs on emulator or device against production or dev URL
- [ ] [MOBILE_LAUNCH_CHECKLIST.md](./MOBILE_LAUNCH_CHECKLIST.md) section F updated for Play builds
