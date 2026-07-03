import { ScreenOrientation } from "@capacitor/screen-orientation";
import { isCapacitorNative } from "@/lib/capacitor/platform";

const PORTRAIT_LOCKS = ["portrait", "portrait-primary"];

/**
 * Lock the native shell to portrait. AndroidManifest / Info.plist are primary;
 * Capacitor Screen Orientation + the web Screen Orientation API reinforce the lock.
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
