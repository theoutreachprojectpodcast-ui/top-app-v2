# Native portrait orientation lock

The Outreach Project Capacitor apps are **portrait-only** on phones and tablets.

## Authoritative sources (compiled into the binary)

| Platform | File | Setting |
|----------|------|---------|
| iOS | `web/ios/App/App/Info.plist` | `UISupportedInterfaceOrientations` + `UISupportedInterfaceOrientations~ipad` = Portrait only; `UIRequiresFullScreen` = true |
| iOS | `web/ios/App/App/AppDelegate.swift` | `supportedInterfaceOrientationsFor` → `.portrait` + geometry update on resume |
| iOS | `web/ios/App/App/MainViewController.swift` | Capacitor bridge VC forces `.portrait`, `shouldAutorotate = false` |
| Android | `web/android/app/src/main/AndroidManifest.xml` | `MainActivity` + Browser plugin activity `android:screenOrientation="portrait"` |
| Android | `…/MainActivity.java` | Re-applies `SCREEN_ORIENTATION_PORTRAIT` on create/resume/focus |

**Do not** enable landscape in Xcode → Target → General → Deployment Info. That can undo `Info.plist`.

**Do not** call `ScreenOrientation.unlock()` in app code. On Android it sets `SCREEN_ORIENTATION_UNSPECIFIED` and allows rotation again.

## Secondary runtime safeguard (web, Capacitor only)

- `web/src/lib/capacitor/lockPortraitOrientation.js`
- Inline bootstrap in `layout.js` (`PORTRAIT_LOCK_BOOTSTRAP_SCRIPT`)
- Does **not** apply to the responsive website in Safari/Chrome

A Vercel deploy cannot change orientation for users who already have a store binary with landscape in `Info.plist` / missing Android `screenOrientation`.

## CI

```bash
pnpm --dir web run validate:portrait-orientation
pnpm run validate:capacitor   # includes portrait checks
```

## Store versions that include this lock (source of truth in repo)

- iOS: marketing **1.0.1**, build **8**
- Android: versionName **1.0.1**, versionCode **7**

## Platform limitations

- System UI (share sheet, photo picker, Safari/Custom Tabs for OAuth/Stripe) may use the OS orientation; the app must return to portrait when control returns.
- iPad Stage Manager / Android multi-window can still produce a wide window even when the activity is portrait-locked; the app will not rotate into landscape interface orientations declared by the binary.
