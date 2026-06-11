const { CAPACITOR_ALLOW_NAVIGATION_HOSTS } = require("./src/lib/capacitor/allowNavigationHosts.js");

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
  appId: "com.theoutreachproject.theoutreachproject",
  appName: "The Outreach Project",
  webDir: "capacitor-www",
  android: {
    allowMixedContent: false,
    /** Match remote HTTPS app origin for cookies / redirects */
    androidScheme: "https",
  },
  ios: {
  /** CSS `env(safe-area-inset-*)` handles insets — avoid stacking with WKWebView automatic inset. */
    contentInset: "never",
    preferredContentMode: "mobile",
    /** OAuth + Stripe stay in the main WKWebView when hosts match `allowNavigation`. */
    limitsNavigationsToAppBoundDomains: false,
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

/** Production WebView origin — override with CAP_SERVER_URL for QA/local emulator sync. */
const PRODUCTION_CAP_SERVER = "https://theoutreachproject.app";

const capServer = String(
  process.env.CAP_SERVER_URL || process.env.MOBILE_PRODUCTION_URL || PRODUCTION_CAP_SERVER,
).trim();
if (capServer) {
  const origin = capServer.replace(/\/$/, "");
  /** Open mobile splash first — loading `/` traps users in TopApp while profile hydrates. */
  const serverUrl = origin.endsWith("/mobile") ? origin : `${origin}/mobile`;
  config.server = {
    url: serverUrl,
    cleartext: origin.startsWith("http://"),
    /** Server must detect Capacitor vs mobile Safari on `/callback` (WKWebView UA is often plain Mobile Safari). */
    appendUserAgent: "TheOutreachProject/Capacitor",
  /** Hostname patterns only (Capacitor matches host, not full URLs). */
    allowNavigation: CAPACITOR_ALLOW_NAVIGATION_HOSTS,
  };
}

module.exports = config;
