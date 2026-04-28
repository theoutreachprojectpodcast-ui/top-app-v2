/**
 * tORP v0.3 — Capacitor wraps the existing Next.js product.
 *
 * Native shells load your real Next app from `server.url` when `CAP_SERVER_URL` is set
 * (deployed HTTPS origin or LAN dev URL). Without it, the WebView shows `capacitor-www/` only.
 *
 * @type {import('@capacitor/cli').CapacitorConfig}
 */
const config = {
  appId: "org.theoutreachproject.torp",
  appName: "The Outreach Project",
  webDir: "capacitor-www",
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

const capServer = String(process.env.CAP_SERVER_URL || "").trim();
if (capServer) {
  config.server = {
    url: capServer,
    cleartext: capServer.startsWith("http://"),
  };
}

module.exports = config;
