import { ScreenOrientation } from "@capacitor/screen-orientation";
import { isCapacitorNative } from "@/lib/capacitor/platform";

/**
 * Lock the native shell to portrait. AndroidManifest / Info.plist are primary;
 * Capacitor Screen Orientation + the web Screen Orientation API reinforce the lock.
 */
export async function lockPortraitOrientation() {
  if (typeof window === "undefined" || !isCapacitorNative()) return;

  try {
    await ScreenOrientation.lock({ orientation: "portrait" });
    return;
  } catch {
    // Plugin unavailable or already locked — try web API below.
  }

  const orientation = window.screen?.orientation;
  if (!orientation || typeof orientation.lock !== "function") return;

  try {
    await orientation.lock("portrait");
  } catch {
    // Native manifest/plist + ScreenOrientation plugin remain authoritative.
  }
}
