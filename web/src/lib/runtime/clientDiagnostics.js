/**
 * Non-secret client diagnostics context for console / future monitoring.
 * Do not attach tokens, passwords, profile PII, or private content.
 */

function browserFamily(ua = "") {
  const s = String(ua);
  if (/Edg\//i.test(s)) return "edge";
  if (/Firefox\//i.test(s)) return "firefox";
  if (/Chrome\//i.test(s) && !/Edg\//i.test(s)) return "chrome";
  if (/Safari\//i.test(s) && !/Chrome\//i.test(s)) return "safari";
  if (/TheOutreachProject\/Capacitor/i.test(s)) return "capacitor-webview";
  return "other";
}

export function getClientDiagnosticsContext(extra = {}) {
  if (typeof window === "undefined") {
    return {
      surface: "server",
      ...extra,
    };
  }
  const ua = navigator.userAgent || "";
  return {
    surface: "browser",
    route: `${window.location.pathname}${window.location.search || ""}`,
    hrefHost: window.location.hostname,
    browserFamily: browserFamily(ua),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    dpr: window.devicePixelRatio || 1,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "",
    commitSha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "",
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "",
    deploymentId: process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID || "",
    ...extra,
  };
}

/** Safe console error with build/browser context (no secrets). */
export function logClientDiagnosticError(label, error, extra = {}) {
  const ctx = getClientDiagnosticsContext(extra);
  const message = error instanceof Error ? error.message : String(error || "unknown");
  console.error(`[top-diagnostic] ${label}`, { message, ...ctx });
}
