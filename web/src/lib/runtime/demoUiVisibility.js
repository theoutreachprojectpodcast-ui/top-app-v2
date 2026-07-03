/**
 * Whether to show local-demo-only UI (Reset Demo, demo membership upgrade, etc.).
 * Never shown inside Capacitor native shells (TestFlight / App Store).
 */
export function showLocalDemoChrome() {
  if (typeof window !== "undefined") {
    try {
      if (window.Capacitor?.isNativePlatform?.()) return false;
    } catch {
      /* ignore */
    }
  }
  if (typeof process !== "undefined" && String(process.env.NEXT_PUBLIC_TOP_SHOW_DEMO_UI || "").trim() === "1") {
    return true;
  }
  if (typeof process !== "undefined" && String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    return false;
  }
  return true;
}
