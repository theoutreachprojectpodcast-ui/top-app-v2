import { ScreenOrientation } from "@capacitor/screen-orientation";
import { App } from "@capacitor/app";
import { isCapacitorNative } from "@/lib/capacitor/platform";

const PORTRAIT_LOCKS = ["portrait", "portrait-primary"];

/**
 * Secondary runtime portrait lock for the Capacitor shell.
 *
 * Primary enforcement is native:
 *   - iOS Info.plist UISupportedInterfaceOrientations (+ ~ipad) = Portrait only
 *   - AndroidManifest MainActivity android:screenOrientation="portrait"
 *   - AppDelegate / MainViewController / MainActivity
 *
 * Never call ScreenOrientation.unlock — on Android it sets
 * SCREEN_ORIENTATION_UNSPECIFIED and re-enables rotation.
 */
export async function lockPortraitOrientation() {
  if (typeof window === "undefined" || !isCapacitorNative()) return;

  for (const orientation of PORTRAIT_LOCKS) {
    try {
      await ScreenOrientation.lock({ orientation });
      return;
    } catch {
      // Try the next lock mode.
    }
  }

  const orientation = window.screen?.orientation;
  if (!orientation || typeof orientation.lock !== "function") return;

  for (const mode of PORTRAIT_LOCKS) {
    try {
      await orientation.lock(mode);
      return;
    } catch {
      // Native manifest/plist remain authoritative.
    }
  }
}

/** Re-lock on resume / deep-link return without stacking duplicate App listeners. */
let resumeLockInstalled = false;

export function installPortraitOrientationResumeLock() {
  if (typeof window === "undefined" || resumeLockInstalled || !isCapacitorNative()) {
    return () => {};
  }
  resumeLockInstalled = true;

  const relock = () => {
    void lockPortraitOrientation();
  };

  relock();

  let appStateListener;
  void App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) relock();
  }).then((handle) => {
    appStateListener = handle;
  });

  window.addEventListener("focus", relock);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) relock();
  });

  return () => {
    resumeLockInstalled = false;
    window.removeEventListener("focus", relock);
    void appStateListener?.remove();
  };
}
