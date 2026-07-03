import { isCapacitorNative } from "@/lib/capacitor/platform";

/**
 * Reinforce portrait lock inside Capacitor WebViews. Native Android/iOS configs are primary;
 * the Screen Orientation API helps where the WebView exposes it.
 */
export async function lockPortraitOrientation() {
  if (typeof window === "undefined" || !isCapacitorNative()) return;

  const orientation = window.screen?.orientation;
  if (!orientation || typeof orientation.lock !== "function") return;

  try {
    await orientation.lock("portrait");
  } catch {
    // Some iOS builds deny lock outside fullscreen — Info.plist orientation still applies.
  }
}
