import { isCapacitorNative } from "@/lib/capacitor/platform";

/** Dismiss the native Capacitor splash (spinner-only overlay on iOS/Android). */
export async function hideCapacitorSplash() {
  if (!isCapacitorNative()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* plugin unavailable on older builds */
  }
}
