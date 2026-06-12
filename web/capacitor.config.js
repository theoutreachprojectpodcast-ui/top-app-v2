const { CAPACITOR_ALLOW_NAVIGATION_HOSTS } = require("./src/lib/capacitor/allowNavigationHosts.js");

/**
 * tORP — Capacitor wraps the existing Next.js product (remote WebView architecture).
 *
 * Production `server.url` is ALWAYS embedded so TestFlight/Xcode archives connect without
 * remembering `CAP_SERVER_URL`. Override only for QA/local: CAP_SERVER_URL at `cap sync` time.
 *
 * @type {import('@capacitor/cli').CapacitorConfig}
 */
const config = {
  appId: "com.theoutreachproject.theoutreachproject",
  appName: "The Outreach Project",
  webDir: "capacitor-www",
  android: {
    allowMixedContent: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
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

const PRODUCTION_ORIGIN = "https://theoutreachproject.app";
const capServerOverride = String(
  process.env.CAP_SERVER_URL || process.env.MOBILE_PRODUCTION_URL || "",
).trim();
const serverOrigin = (capServerOverride || PRODUCTION_ORIGIN).replace(/\/$/, "");
const serverUrl = serverOrigin.endsWith("/mobile") ? serverOrigin : `${serverOrigin}/mobile`;

config.server = {
  url: serverUrl,
  cleartext: serverOrigin.startsWith("http://"),
  errorPath: "error.html",
  appendUserAgent: "TheOutreachProject/Capacitor",
  allowNavigation: CAPACITOR_ALLOW_NAVIGATION_HOSTS,
};

module.exports = config;
