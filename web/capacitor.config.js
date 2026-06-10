/**
 * tORP — Capacitor wraps the existing Next.js product (remote WebView architecture).
 *
 * Config is JavaScript (not TypeScript) so `npx cap` works without a TS loader.
 * Native shells load the real app from `server.url` when `CAP_SERVER_URL` is set.
 * Without it, the WebView shows `capacitor-www/` fallback only.
 *
 * Env (set only when running `cap sync` — never commit secrets):
 *   CAP_SERVER_URL — https://theoutreachproject.app | QA host | http://10.0.2.2:3001 (emulator)
 *
 * @type {import('@capacitor/cli').CapacitorConfig}
 */
const config = {
  appId: "org.theoutreachproject.torp",
  appName: "The Outreach Project",
  webDir: "capacitor-www",
  android: {
    allowMixedContent: false,
    /** Match remote HTTPS app origin for cookies / redirects */
    androidScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    /** Prefer Safari-like behavior for WorkOS / Stripe redirects */
    preferredContentMode: "mobile",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      showSpinner: true,
      iosSpinnerStyle: "large",
      androidSpinnerStyle: "large",
      spinnerColor: "#22a52b",
      backgroundColor: "#121212",
    },
  },
};

const capServer = String(process.env.CAP_SERVER_URL || "").trim();
if (capServer) {
  const origin = capServer.replace(/\/$/, "");
  config.server = {
    url: origin,
    cleartext: origin.startsWith("http://"),
    /** Allow in-WebView navigation to auth and Supabase storage — not Stripe (billing opens in system browser). */
    allowNavigation: [
      origin,
      "https://*.workos.com",
      "https://api.workos.com",
      "https://*.supabase.co",
    ],
  };
}

module.exports = config;
