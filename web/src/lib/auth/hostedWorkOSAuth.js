import { isDemoModeEnabled } from "@/lib/runtime/launchMode";

/**
 * Whether the UI must route sign-in/sign-up through hosted WorkOS AuthKit.
 * Production and other non-demo deployments always use WorkOS — never local demo auth —
 * even while `/api/auth/status` is still loading or failed.
 *
 * @param {{ workos?: boolean }} [authBackend]
 */
export function shouldUseHostedWorkOSAuth(authBackend = {}) {
  if (!isDemoModeEnabled()) return true;
  return !!authBackend.workos;
}
