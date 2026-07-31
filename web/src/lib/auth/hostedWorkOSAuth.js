import { isDemoModeEnabled } from "@/lib/runtime/launchMode";

function isLocalDevHostname(hostname) {
  const host = String(hostname || "")
    .trim()
    .toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function isLocalDevAppUrl() {
  if (typeof window !== "undefined" && isLocalDevHostname(window.location.hostname)) {
    return true;
  }
  const raw = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "").trim();
  if (!raw) return false;
  try {
    return isLocalDevHostname(new URL(raw).hostname);
  } catch {
    return false;
  }
}

/**
 * Whether the UI must route sign-in/sign-up through hosted WorkOS AuthKit.
 * Production and other non-demo deployments always use WorkOS — never local demo auth —
 * even while `/api/auth/status` is still loading or failed.
 *
 * Localhost: prefer demo email/password when demo flows are enabled, so developers can
 * sign in without Staging WorkOS users. Force hosted AuthKit with NEXT_PUBLIC_FORCE_WORKOS_AUTH=1.
 *
 * @param {{ workos?: boolean }} [authBackend]
 */
export function shouldUseHostedWorkOSAuth(authBackend = {}) {
  if (!isDemoModeEnabled()) return true;
  const forceWorkos = String(process.env.NEXT_PUBLIC_FORCE_WORKOS_AUTH || "")
    .trim()
    .toLowerCase();
  if (forceWorkos === "1" || forceWorkos === "true") {
    return !!authBackend.workos;
  }
  if (isLocalDevAppUrl()) {
    return false;
  }
  return !!authBackend.workos;
}
